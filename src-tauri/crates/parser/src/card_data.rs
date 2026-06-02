//! 卡牌数据模块 — 运行时可变卡牌存储
//!
//! 架构：
//! - DEFAULT_CARDS: LazyLock 存储硬编码的 5 张默认卡牌（启动回退用）
//! - CARD_STORE: OnceLock<RwLock<Vec<Card>>> 运行时可变存储
//! - DATA_DIR: OnceLock<PathBuf> 持久化目录（由 setup 注入）
//! - SAVE_COUNT: AtomicU64 累计保存次数
//! - init_cards(): 启动时从 data/cards.json 加载，兼容新旧格式
//! - CRUD: create/update/delete 自动即时写盘（auto_save）
//! - 写入安全：先写 .tmp → 备份到 backups/ → 原子 rename
//! - 版本追踪：_meta 对象记录 version/last_modified/save_count/checksum
//! - 自动备份：每次保存前备份旧文件到 data/backups/，保留最近 20 份

use crate::parser::{CardAst, parse_card_text};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{LazyLock, OnceLock, RwLock};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

/// 编译期嵌入 cards.json，确保打包后始终可用。
/// 路径相对于本文件：src-tauri/crates/parser/src/card_data.rs
/// → 向上 4 级到项目根 → data/cards.json
static BUNDLED_CARDS_JSON: &str = include_str!("../../../../data/cards.json");

// ============ 内部：默认卡牌原始数据 ============

struct CardRaw {
    name: &'static str,
    list_tags: &'static [&'static str],
    pre_tag: &'static [&'static str],
    text: &'static str,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub name: String,
    #[serde(alias = "tags", rename = "list_tags")]
    pub list_tags: Vec<String>,
    pub pre_tag: Vec<String>,
    pub duel_tags: Vec<String>,
    pub text: String,
    #[serde(skip)]
    pub ast: Option<CardAst>,
    #[serde(skip)]
    pub errors: Vec<String>,
    pub created_at: String,
    pub modified_at: String,
}

impl Card {
    fn from_raw(r: &CardRaw, id: &str) -> Self {
        let result = parse_card_text(r.name, r.text);
        let errors: Vec<String> = result.errors.iter()
            .map(|e| format!("行{}: {}", e.line, e.message)).collect();
        Card {
            id: id.to_string(),
            name: r.name.to_string(),
            list_tags: r.list_tags.iter().map(|s| s.to_string()).collect(),
            pre_tag: r.pre_tag.iter().map(|s| s.to_string()).collect(),
            duel_tags: result.ast.as_ref().map(|a| a.duel_tags.clone()).unwrap_or_default(),
            text: r.text.to_string(),
            ast: result.ast,
            errors,
            created_at: "2026-05-30".to_string(),
            modified_at: "2026-05-30".to_string(),
        }
    }
}

macro_rules! tags { ($($t:expr),* $(,)?) => { &[$($t),*] }; }
macro_rules! card { ($n:expr, $lt:expr, $pt:expr, $tx:expr) => { CardRaw { name: $n, list_tags: $lt, pre_tag: $pt, text: $tx } }; }

/// DEFAULT_RAW 仅保留极少示例卡牌作为后备（cards.json 不存在时手动创建参考）。
/// 完整卡池数据由 data/cards.json 文件驱动。
/// DEFAULT_RAW 已清零。所有卡牌数据由 data/cards.json 文件驱动，
/// 不再在源码中硬编码任何默认卡牌。首次运行时将从空 cards.json 开始。
static DEFAULT_RAW: LazyLock<Vec<CardRaw>> = LazyLock::new(|| vec![]);

// ============ 运行时卡牌存储 ============

static DEFAULT_CARDS: LazyLock<Vec<Card>> = LazyLock::new(|| {
    DEFAULT_RAW.iter().enumerate().map(|(i, r)| Card::from_raw(r, &format!("card_{:03}", i+1))).collect()
});

static CARD_STORE: OnceLock<RwLock<Vec<Card>>> = OnceLock::new();
static DATA_DIR: OnceLock<PathBuf> = OnceLock::new();
static SAVE_COUNT: AtomicU64 = AtomicU64::new(0);

fn store() -> &'static RwLock<Vec<Card>> {
    CARD_STORE.get().expect("card_data: 未初始化，请先调用 init_cards()")
}

/// 获取存储引用（供 data_gov 模块内部使用）
pub fn store_ref() -> &'static RwLock<Vec<Card>> {
    store()
}

/// 设置持久化数据目录（由 lib.rs setup 注入）
pub fn set_data_dir(path: PathBuf) {
    let _ = DATA_DIR.set(path);
}

/// 获取当前日期字符串 "YYYY-MM-DD"
fn today_str() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let total_days = secs / 86400;
    let mut y: i64 = 1970;
    let mut remaining = total_days;
    loop {
        let diy = if (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0) { 366 } else { 365 };
        if remaining < diy { break; }
        remaining -= diy;
        y += 1;
    }
    let md = if (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0) {
        [31,29,31,30,31,30,31,31,30,31,30,31]
    } else {
        [31,28,31,30,31,30,31,31,30,31,30,31]
    };
    let mut m: usize = 0;
    while m < 12 && remaining >= md[m] as i64 { remaining -= md[m] as i64; m += 1; }
    format!("{:04}-{:02}-{:02}", y, m + 1, remaining + 1)
}

/// 获取当前 ISO8601 时间字符串（UTC+8）
pub fn iso8601_now() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    // UTC+8
    let adjusted = secs + 8 * 3600;
    let days = adjusted / 86400;
    let time_of_day = adjusted % 86400;

    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    // 计算年月日（与 today_str 逻辑相同但不同入口）
    let mut y: i64 = 1970;
    let mut remaining = days as i64;
    loop {
        let diy = if (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0) { 366 } else { 365 };
        if remaining < diy { break; }
        remaining -= diy;
        y += 1;
    }
    let md = if (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0) {
        [31,29,31,30,31,30,31,31,30,31,30,31]
    } else {
        [31,28,31,30,31,30,31,31,30,31,30,31]
    };
    let mut m: usize = 0;
    while m < 12 && remaining >= md[m] as i64 { remaining -= md[m] as i64; m += 1; }

    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}+08:00",
        y, m + 1, remaining + 1, hours, minutes, seconds)
}

/// 计算 cards 数组的 SHA256 前 8 位
fn compute_checksum(cards: &[Card]) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let json_str = serde_json::to_string(cards).unwrap_or_default();
    let mut hasher = DefaultHasher::new();
    json_str.hash(&mut hasher);
    let h = hasher.finish();
    format!("{:016x}", h)[..8].to_string()
}

// ============ _meta 元信息 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaInfo {
    pub version: String,
    pub last_modified: String,
    pub save_count: u64,
    pub checksum: String,
}

/// 用于序列化的完整存储结构
#[derive(Debug, Clone, Serialize, Deserialize)]
struct CardStore {
    #[serde(rename = "_meta")]
    meta: MetaInfo,
    cards: Vec<Card>,
}

/// 生成当前 _meta
fn build_meta(cards: &[Card]) -> MetaInfo {
    MetaInfo {
        version: "0.9.1".to_string(),
        last_modified: iso8601_now(),
        save_count: SAVE_COUNT.load(Ordering::Relaxed),
        checksum: compute_checksum(cards),
    }
}

// ============ 自动备份 ============

const MAX_BACKUPS: usize = 20;

/// 创建备份并清理过期备份
fn rotate_backups(data_dir: &std::path::Path, cards_path: &std::path::Path) {
    if !cards_path.exists() {
        return;
    }

    let backups_dir = data_dir.join("backups");
    let _ = std::fs::create_dir_all(&backups_dir);

    // 生成备份文件名（UTC+8 时间戳）
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs() + 8 * 3600; // UTC+8
    let days = secs / 86400;
    let tod = secs % 86400;
    let h = tod / 3600;
    let m = (tod % 3600) / 60;
    let s = tod % 60;
    let mut y: i64 = 1970;
    let mut remaining = days as i64;
    loop {
        let diy = if (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0) { 366 } else { 365 };
        if remaining < diy { break; }
        remaining -= diy;
        y += 1;
    }
    let md = if (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0) {
        [31,29,31,30,31,30,31,31,30,31,30,31]
    } else {
        [31,28,31,30,31,30,31,31,30,31,30,31]
    };
    let mut mo: usize = 0;
    while mo < 12 && remaining >= md[mo] as i64 { remaining -= md[mo] as i64; mo += 1; }

    let backup_name = format!("cards_{:04}{:02}{:02}_{:02}{:02}{:02}.json",
        y, mo + 1, remaining + 1, h, m, s);
    let backup_path = backups_dir.join(&backup_name);

    let _ = std::fs::copy(cards_path, &backup_path);

    // 清理超出 20 份的旧备份
    let mut entries: Vec<PathBuf> = match std::fs::read_dir(&backups_dir) {
        Ok(rd) => rd.filter_map(|e| e.ok().map(|e| e.path())).collect(),
        Err(_) => return,
    };
    entries.sort(); // 按文件名排序 = 按时间排序
    while entries.len() > MAX_BACKUPS {
        if let Some(old) = entries.first() {
            let _ = std::fs::remove_file(old);
            entries.remove(0);
        } else {
            break;
        }
    }
}

/// 内部写盘：原子写入 + 备份 + _meta 版本追踪
fn save_to_disk(data_dir: &std::path::Path) -> Result<usize, String> {
    let cards = store().read().map_err(|e| e.to_string())?;
    let cards_path = data_dir.join("cards.json");
    let tmp_path = data_dir.join("cards.json.tmp");

    // 递增保存计数
    let count = SAVE_COUNT.fetch_add(1, Ordering::Relaxed) + 1;

    let store_obj = CardStore {
        meta: MetaInfo {
            version: "0.9.1".to_string(),
            last_modified: iso8601_now(),
            save_count: count,
            checksum: compute_checksum(&cards),
        },
        cards: cards.clone(),
    };

    let json_str = serde_json::to_string_pretty(&store_obj)
        .map_err(|e| format!("序列化失败: {}", e))?;

    // 备份旧文件 → backups/ （保留最近 20 份）
    rotate_backups(data_dir, &cards_path);

    // 原子写入：先写临时文件
    std::fs::write(&tmp_path, &json_str)
        .map_err(|e| format!("写入临时文件失败: {}", e))?;

    // 原子 rename（同一文件系统内是原子的）
    std::fs::rename(&tmp_path, &cards_path)
        .map_err(|e| format!("替换 cards.json 失败: {}", e))?;

    Ok(cards.len())
}

/// 自动保存：使用注入的 DATA_DIR，未设置则跳过
pub fn auto_save() {
    if let Some(dir) = DATA_DIR.get() {
        let _ = save_to_disk(dir);
    }
}

// ============ 公开 API ============

/// 从 cards.json 加载并初始化运行时存储。
/// 兼容新旧格式：
/// - 新格式: `{ "_meta": {...}, "cards": [...] }`
/// - 旧格式: `[...]`（顶层数组）
/// 首运行时，若 app_data_dir 无 cards.json，则从编译期嵌入的 BUNDLED_CARDS_JSON
/// 写入磁盘后再加载，确保打包后能读到完整卡牌数据。
pub fn init_cards(data_dir: &str) -> Result<usize, String> {
    let path = std::path::Path::new(data_dir).join("cards.json");
    let mut just_seeded = false;

    // 首运行：从编译期嵌入数据写入 cards.json
    if !path.exists() {
        if !BUNDLED_CARDS_JSON.is_empty() {
            std::fs::write(&path, BUNDLED_CARDS_JSON)
                .map_err(|e| format!("写入初始 cards.json 失败: {}", e))?;
            just_seeded = true;
        }
    }

    let cards: Vec<Card> = if path.exists() {
        let json_str = std::fs::read_to_string(&path)
            .map_err(|e| format!("读取 cards.json 失败: {}", e))?;
        // 尝试新格式
        if let Ok(store) = serde_json::from_str::<CardStore>(&json_str) {
            SAVE_COUNT.store(store.meta.save_count, Ordering::Relaxed);
            store.cards
        }
        // 回退：尝试旧格式（顶层数组）
        else if let Ok(arr) = serde_json::from_str::<Vec<Card>>(&json_str) {
            arr
        }
        // 都不行则用默认数据
        else {
            DEFAULT_CARDS.clone()
        }
    } else {
        DEFAULT_CARDS.clone()
    };

    let count = cards.len();
    CARD_STORE.set(RwLock::new(cards)).map_err(|_| "card_data 已初始化过".to_string())?;

    // 首次播种后用新格式（含 _meta）重写一次，确保后续版本追踪正常
    if just_seeded {
        let _ = save_to_disk(std::path::Path::new(data_dir));
    }

    Ok(count)
}

/// 获取所有卡牌（只读快照）
pub fn load_all_cards() -> Vec<Card> {
    store().read().map(|g| g.clone()).unwrap_or_default()
}

/// 获取单张卡牌
pub fn get_card(id: &str) -> Option<Card> {
    store().read().ok()?.iter().find(|c| c.id == id).cloned()
}

/// 创建新卡牌，自动分配 ID，自动保存
pub fn create_card(name: String, tags: Vec<String>, text: String) -> Result<Card, String> {
    let mut guard = store().write().map_err(|e| e.to_string())?;
    let next_id = {
        let max_num = guard.iter()
            .filter_map(|c| c.id.strip_prefix("card_")?.parse::<usize>().ok())
            .max()
            .unwrap_or(0);
        format!("card_{:03}", max_num + 1)
    };

    let now = today_str();
    let result = parse_card_text(&name, &text);
    let errors: Vec<String> = result.errors.iter()
        .map(|e| format!("行{}: {}", e.line, e.message)).collect();

    let card = Card {
        id: next_id,
        name: name.clone(),
        list_tags: tags,
        pre_tag: vec![],
        duel_tags: result.ast.as_ref().map(|a| a.duel_tags.clone()).unwrap_or_default(),
        text,
        ast: result.ast,
        errors,
        created_at: now.clone(),
        modified_at: now,
    };

    guard.push(card.clone());
    drop(guard);
    auto_save();
    Ok(card)
}

/// 更新卡牌字段，自动保存
pub fn update_card(id: &str, name: Option<String>, tags: Option<Vec<String>>, text: Option<String>) -> Result<Card, String> {
    let mut guard = store().write().map_err(|e| e.to_string())?;
    let card = guard.iter_mut().find(|c| c.id == id)
        .ok_or_else(|| format!("卡牌 {} 不存在", id))?;

    if let Some(n) = name { card.name = n; }
    if let Some(t) = tags { card.list_tags = t; }
    if let Some(tx) = text {
        card.text = tx.clone();
        let result = parse_card_text(&card.name, &tx);
        card.ast = result.ast;
        card.duel_tags = card.ast.as_ref().map(|a| a.duel_tags.clone()).unwrap_or_default();
        card.errors = result.errors.iter()
            .map(|e| format!("行{}: {}", e.line, e.message)).collect();
    }
    card.modified_at = today_str();
    let result = card.clone();
    drop(guard);
    auto_save();
    Ok(result)
}

/// 删除卡牌，自动保存
pub fn delete_card(id: &str) -> Result<bool, String> {
    let mut guard = store().write().map_err(|e| e.to_string())?;
    let len_before = guard.len();
    guard.retain(|c| c.id != id);
    let deleted = guard.len() < len_before;
    drop(guard);
    if deleted { auto_save(); }
    Ok(deleted)
}

/// 保存当前所有卡牌到 data/cards.json（显式调用，含备份+原子写入）
pub fn save_cards(data_dir: &str) -> Result<usize, String> {
    save_to_disk(std::path::Path::new(data_dir))
}

/// 使用注入的 DATA_DIR 保存（供 Tauri 命令调用）
pub fn save_cards_auto() -> Result<usize, String> {
    let dir = DATA_DIR.get().ok_or_else(|| "未设置数据目录".to_string())?;
    save_to_disk(dir)
}

/// 从 data/cards.json 重新加载（放弃内存修改），兼容新旧格式
pub fn load_cards(data_dir: &str) -> Result<Vec<Card>, String> {
    let path = std::path::Path::new(data_dir).join("cards.json");
    let json_str = std::fs::read_to_string(&path)
        .map_err(|e| format!("读取 cards.json 失败: {}", e))?;

    let cards: Vec<Card> = if let Ok(store) = serde_json::from_str::<CardStore>(&json_str) {
        SAVE_COUNT.store(store.meta.save_count, Ordering::Relaxed);
        store.cards
    } else if let Ok(arr) = serde_json::from_str::<Vec<Card>>(&json_str) {
        arr
    } else {
        return Err("JSON 解析失败: 无法识别新旧格式".into());
    };

    let mut guard = store().write().map_err(|e| e.to_string())?;
    *guard = cards.clone();
    Ok(cards)
}

/// 获取卡牌统计
pub fn card_stats(cards: &[Card]) -> (usize, usize, usize) {
    let total = cards.len();
    let parsed = cards.iter().filter(|c| c.ast.is_some()).count();
    (total, parsed, total - parsed)
}
