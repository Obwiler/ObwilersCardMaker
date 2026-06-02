//! 三级降级链 — 文件损坏时的逐级恢复
//!
//! 当 card.dz 或 meta.json 损坏/丢失时，按三级逐级降级恢复：
//!
//!   Level 1 — 直接读取原文件                                       → OK
//!   Level 2 — 读取 .backup 备份（每次保存自动生成）                   → OK
//!   Level 3 — 从 _distribution.json 重建最小 card.dz + meta.json    → OK
//!             ├─ card.dz  → "卡名 [category, 恢复]\n  请重新编辑效果文本。"
//!             └─ meta.json → distribution 中的 category/name/id/count
//!
//! 使用示例：
//!   let result = DegradationChain::load_with_fallback(&repo, &id, &cards_dir);
//!   match result.level { FallbackLevel::Direct => "正常", ... }

use std::fs;
use std::path::PathBuf;
use dz_cardmaker_ports::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FallbackLevel {
    Direct,
    Backup,
    Rebuilt,
}

pub struct FallbackResult {
    pub bundle: CardBundle,
    pub level: FallbackLevel,
    pub was_recovered: bool,
}

pub struct DegradationChain;

impl DegradationChain {
    /// 尝试加载卡牌，按三级降级恢复
    pub fn load_with_fallback(
        cards_dir: &std::path::Path,
        id: &StaticCardId,
    ) -> Result<FallbackResult, String> {
        let dir = find_card_dir(cards_dir, id)
            .ok_or_else(|| format!("卡牌 {} 目录不存在，无法加载", id.0))?;

        // Level 1: 尝试直接读取
        if let Ok(bundle) = direct_load(&dir, id) {
            return Ok(FallbackResult { bundle, level: FallbackLevel::Direct, was_recovered: false });
        }

        // Level 2: 尝试从 .backup 恢复
        if let Ok(bundle) = backup_load(&dir, id) {
            // 恢复后重写原始文件
            restore_from_backup(&dir, &bundle).ok();
            return Ok(FallbackResult { bundle, level: FallbackLevel::Backup, was_recovered: true });
        }

        // Level 3: 从 distribution.json 重建最小文件
        if let Ok(bundle) = rebuild_from_distribution(cards_dir, &dir, id) {
            return Ok(FallbackResult { bundle, level: FallbackLevel::Rebuilt, was_recovered: true });
        }

        Err(format!("卡牌 {} 无法加载：三级降级全部失败", id.0))
    }

    /// 保存时自动生成 .backup 和 .previous_backup
    pub fn save_with_backup(dir: &std::path::Path, filename: &str, content: &str) -> Result<(), String> {
        let main_path = dir.join(filename);
        let backup_path = dir.join(format!("{}.backup", filename));
        let prev_backup = dir.join(format!("{}.previous_backup", filename));

        // 如果存在旧的原文件，先备份它
        if main_path.exists() {
            if let Ok(existing) = fs::read_to_string(&main_path) {
                // 验证旧内容非空
                if !existing.trim().is_empty() {
                    // 旋转：backup → previous_backup, original → backup
                    if backup_path.exists() {
                        fs::rename(&backup_path, &prev_backup).ok();
                    }
                    fs::write(&backup_path, existing)
                        .map_err(|e| format!("备份失败: {}", e))?;
                }
            }
        }

        // 写入新内容
        fs::create_dir_all(dir).map_err(|e| format!("创建目录失败: {}", e))?;
        fs::write(&main_path, content)
            .map_err(|e| format!("写入 {} 失败: {}", main_path.display(), e))?;

        Ok(())
    }
}

// ============================================================================
// Level 1: 直接读取
// ============================================================================

fn direct_load(dir: &std::path::Path, _id: &StaticCardId) -> Result<CardBundle, String> {
    let source = read_validated_file(dir, "card.dz")?;
    let meta_raw = read_validated_file(dir, "meta.json")?;
    let meta: CardMeta = serde_json::from_str(&meta_raw)
        .map_err(|e| format!("meta.json 格式损坏: {}", e))?;

    Ok(CardBundle { meta, source, ast: serde_json::Value::Null })
}

fn read_validated_file(dir: &std::path::Path, filename: &str) -> Result<String, String> {
    let path = dir.join(filename);
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("读取 {}: {}", path.display(), e))?;
    if content.trim().is_empty() {
        return Err(format!("{} 内容为空", path.display()));
    }
    Ok(content)
}

// ============================================================================
// Level 2: 备份恢复
// ============================================================================

fn backup_load(dir: &std::path::Path, _id: &StaticCardId) -> Result<CardBundle, String> {
    let source = read_validated_file(dir, "card.dz.backup")?;
    let meta_raw = read_validated_file(dir, "meta.json.backup")?;
    let meta: CardMeta = serde_json::from_str(&meta_raw)
        .map_err(|e| format!("meta.json.backup 格式损坏: {}", e))?;

    Ok(CardBundle { meta, source, ast: serde_json::Value::Null })
}

fn restore_from_backup(dir: &std::path::Path, bundle: &CardBundle) -> Result<(), String> {
    let meta_json = serde_json::to_string_pretty(&bundle.meta)
        .map_err(|e| format!("序列化 meta 失败: {}", e))?;
    fs::write(dir.join("card.dz"), &bundle.source)
        .map_err(|e| format!("恢复 card.dz 失败: {}", e))?;
    fs::write(dir.join("meta.json"), &meta_json)
        .map_err(|e| format!("恢复 meta.json 失败: {}", e))?;
    Ok(())
}

// ============================================================================
// Level 3: 从 distribution.json 重建
// ============================================================================

fn rebuild_from_distribution(cards_dir: &std::path::Path, dir: &std::path::Path, id: &StaticCardId) -> Result<CardBundle, String> {
    let dist_path = cards_dir.join("_distribution.json");
    let dist_json = fs::read_to_string(&dist_path)
        .map_err(|e| format!("读取配比表失败: {}", e))?;
    let dist_json = dist_json.trim_start_matches('\u{feff}');

    let parsed: serde_json::Value = serde_json::from_str(dist_json)
        .map_err(|e| format!("解析配比表: {}", e))?;

    let entries = parsed["entries"].as_array()
        .ok_or("配比表结构异常")?;

    let entry = entries.iter()
        .find(|e| e["id"].as_str() == Some(&id.0))
        .ok_or_else(|| format!("{} 不在配比表中，无法重建", id.0))?;

    let name = entry["name"].as_str().unwrap_or(&id.0);
    let category = entry["category"].as_str().unwrap_or("未知");

    // 重建 card.dz
    let rebuilt_source = format!("{} [{}, 恢复]\n  请重新编辑效果文本。\n  —常驻：此卡从备份重建。\n", name, category);

    // 重建 meta.json
    let meta = CardMeta {
        id: id.clone(),
        name: name.to_string(),
        category: category.to_string(),
        attributes: serde_json::json!({"rebuilt": true, "recovered_at": chrono::Utc::now().to_rfc3339()}),
        version: "0.10.0-rebuilt".into(),
    };

    let meta_json = serde_json::to_string_pretty(&meta)
        .map_err(|e| format!("序列化重建 meta: {}", e))?;

    fs::write(dir.join("card.dz"), &rebuilt_source)
        .map_err(|e| format!("写入重建的 card.dz: {}", e))?;
    fs::write(dir.join("meta.json"), &meta_json)
        .map_err(|e| format!("写入重建的 meta.json: {}", e))?;

    Ok(CardBundle {
        meta,
        source: rebuilt_source,
        ast: serde_json::Value::Null,
    })
}

// ============================================================================
// 辅助
// ============================================================================

fn find_card_dir(cards_dir: &std::path::Path, id: &StaticCardId) -> Option<PathBuf> {
    let entries = fs::read_dir(cards_dir).ok()?;
    for entry in entries.filter_map(|e| e.ok()) {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if name_str.starts_with(&id.0) {
            return Some(entry.path());
        }
    }
    None
}

// ============================================================================
// 集成到 FileCardRepository
// ============================================================================

/// 包装 FileCardRepository 的 load 方法，自动启用三级降级链
pub fn load_card_safe(cards_dir: &std::path::Path, id: &StaticCardId) -> Result<CardBundle, String> {
    let result = DegradationChain::load_with_fallback(cards_dir, id)?;
    if result.was_recovered {
        log::warn!("卡牌 {} 已被恢复（级别: {:?}）", id.0, result.level);
    }
    Ok(result.bundle)
}

/// 包装 FileCardRepository 的 save 方法，自动创建备份
pub fn save_card_safe(cards_dir: &std::path::Path, id: &StaticCardId, source: &str, meta: &CardMeta) -> Result<(), String> {
    let dir = find_card_dir(cards_dir, id)
        .ok_or_else(|| format!("卡牌 {} 目录不存在", id.0))?;

    DegradationChain::save_with_backup(&dir, "card.dz", source)?;

    let meta_json = serde_json::to_string_pretty(meta)
        .map_err(|e| format!("序列化 meta: {}", e))?;
    DegradationChain::save_with_backup(&dir, "meta.json", &meta_json)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_card(dir: &std::path::Path, id: &str, source: &str, name: &str) {
        let card_dir = dir.join(format!("{}_test", id));
        std::fs::create_dir_all(&card_dir).unwrap();
        std::fs::write(card_dir.join("card.dz"), source).unwrap();
        let meta = CardMeta {
            id: StaticCardId(id.into()),
            name: name.into(),
            category: "基本牌".into(),
            attributes: serde_json::json!({}),
            version: "0.10.0".into(),
        };
        std::fs::write(card_dir.join("meta.json"), serde_json::to_string(&meta).unwrap()).unwrap();
    }

    #[test]
    fn test_direct_load_works() {
        let tmp = TempDir::new().unwrap();
        create_test_card(tmp.path(), "JB01", "测试 [基本牌, 白]\n  效果。", "测试");
        let result = DegradationChain::load_with_fallback(tmp.path(), &StaticCardId("JB01".into()));
        assert!(result.is_ok());
        assert_eq!(result.unwrap().level, FallbackLevel::Direct);
    }

    #[test]
    fn test_backup_fallback() {
        let tmp = TempDir::new().unwrap();
        create_test_card(tmp.path(), "JB02", "测试 [基本牌, 白]\n  效果。", "测试");
        let card_dir = find_card_dir(tmp.path(), &StaticCardId("JB02".into())).unwrap();

        // Corrupt main file
        std::fs::write(card_dir.join("card.dz"), "").unwrap();

        // Create backup
        std::fs::write(card_dir.join("card.dz.backup"), "测试 [基本牌, 白]\n  备份效果。").unwrap();
        std::fs::write(card_dir.join("meta.json.backup"),
            r#"{"id":"JB02","name":"测试","category":"基本牌","attributes":{},"version":"0.10.0"}"#).unwrap();

        // Corruption should not cause meta.json to fail
        // Actually the meta.json is still valid, just card.dz is corrupted
        // Let me re-think — both card.dz AND meta.json need to exist
        // The test needs to only corrupt card.dz, not meta.json

        let result = DegradationChain::load_with_fallback(tmp.path(), &StaticCardId("JB02".into()));
        assert!(result.is_ok(), "Should load from backup: {:?}", result.err());
    }

    #[test]
    fn test_not_found_error() {
        let tmp = TempDir::new().unwrap();
        let result = DegradationChain::load_with_fallback(tmp.path(), &StaticCardId("XX99".into()));
        assert!(result.is_err());
    }

    #[test]
    fn test_save_with_backup_rotation() {
        let tmp = TempDir::new().unwrap();
        let card_dir = tmp.path().join("XX00_test");
        std::fs::create_dir_all(&card_dir).unwrap();

        // First save
        DegradationChain::save_with_backup(&card_dir, "test.txt", "v1").unwrap();
        assert_eq!(std::fs::read_to_string(card_dir.join("test.txt")).unwrap(), "v1");

        // Second save — should create backup
        DegradationChain::save_with_backup(&card_dir, "test.txt", "v2").unwrap();
        assert_eq!(std::fs::read_to_string(card_dir.join("test.txt")).unwrap(), "v2");
        assert_eq!(std::fs::read_to_string(card_dir.join("test.txt.backup")).unwrap(), "v1");

        // Third save — should rotate
        DegradationChain::save_with_backup(&card_dir, "test.txt", "v3").unwrap();
        assert_eq!(std::fs::read_to_string(card_dir.join("test.txt")).unwrap(), "v3");
        assert_eq!(std::fs::read_to_string(card_dir.join("test.txt.backup")).unwrap(), "v2");
        assert_eq!(std::fs::read_to_string(card_dir.join("test.txt.previous_backup")).unwrap(), "v1");
    }
}
