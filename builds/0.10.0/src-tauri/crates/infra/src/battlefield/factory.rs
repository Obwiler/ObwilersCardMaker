//! 实例化工工厂 — 配比表 → 洗牌 → 创建 160 张运行时实例
//!
//! 读取 `cards/_distribution.json`，按配比生成 RuntimeCardInstance，
//! Fisher-Yates 洗牌，按阵营+职业+构筑+基本牌分配至玩家牌堆。
//!
//! 配比关系：
//!   阵营 5 张 × 1 = 5    职业 12 张 × 1 = 12
//!   构筑 40 张 × 2 = 80   基本 21 张 × 3 = 63
//!   总计 = 160 张运行时实例

use std::fs;
use std::path::Path;
use dz_cardmaker_ports::*;

use rand::seq::SliceRandom;
use rand::thread_rng;

#[derive(Debug)]
pub struct DeckSetup {
    pub player_decks: Vec<Vec<RuntimeCardInstance>>,
    pub all_instances: Vec<RuntimeCardInstance>,
}

/// 从 cards/ 目录读取配比表，创建所有实例，洗牌，分配牌堆
pub fn build_decks(cards_dir: &Path, player_count: usize) -> Result<DeckSetup, String> {
    let dist_path = cards_dir.join("_distribution.json");
    let dist_json = fs::read_to_string(&dist_path)
        .map_err(|e| format!("读取配比表失败 {}: {}", dist_path.display(), e))?;

    // Strip UTF-8 BOM if present
    let dist_json = dist_json.trim_start_matches('\u{feff}');

    let parsed: serde_json::Value = serde_json::from_str(dist_json)
        .map_err(|e| format!("解析JSON失败 {}: {}", dist_path.display(), e))?;

    let entries_raw = parsed["entries"]
        .as_array()
        .ok_or_else(|| "配比表缺少 entries 数组".to_string())?;

    let mut entries = Vec::new();
    for entry_val in entries_raw {
        let cat = entry_val["category"].as_str().unwrap_or("");
        let nam = entry_val["name"].as_str().unwrap_or("");
        let id  = entry_val["id"].as_str().unwrap_or("");
        let cnt = entry_val["count"].as_u64().unwrap_or(0);
        entries.push(DistributionEntry {
            category: cat.to_string(),
            name: nam.to_string(),
            id: id.to_string(),
            count: cnt as u32,
        });
    }

    let dist = Distribution { entries };

    if player_count < 2 {
        return Err("至少需要2名玩家".into());
    }

    // --- 创建所有实例 ---
    let mut instances = Vec::new();
    let mut seq = 0u32;

    for entry in &dist.entries {
        for _copy in 0..entry.count {
            seq += 1;
            let runtime_id = RuntimeCardId(format!("{}_{}", entry.id, seq));
            instances.push(RuntimeCardInstance {
                runtime_id,
                static_def_ref: StaticCardId(entry.id.clone()),
                zone: Zone::Deck,
                owner: PlayerId("unassigned".into()),
                hp: 0,
                armor: 0,
                energy: 0,
                marks: Default::default(),
            });
        }
    }

    // --- Fisher-Yates 洗牌 ---
    let mut rng = thread_rng();
    instances.shuffle(&mut rng);

    // --- 按卡牌类型分组 ---
    let mut faction_cards    = Vec::new(); // 阵营
    let mut career_cards     = Vec::new(); // 职业
    let mut construct_cards  = Vec::new(); // 构筑
    let mut basic_cards      = Vec::new(); // 基本牌

    for inst in &instances {
        match inst.static_def_ref.0.chars().next() {
            Some('Z') if inst.static_def_ref.0.starts_with("ZY") => {
                // ZY01-ZY05 = 阵营, ZY06-ZY17 = 职业
                let num: u32 = inst.static_def_ref.0[2..].parse().unwrap_or(99);
                if num <= 5 { faction_cards.push(inst.clone()); }
                else { career_cards.push(inst.clone()); }
            }
            _ => {
                // GZ = 构筑卡, JB = 基本牌
                if inst.static_def_ref.0.starts_with("GZ") {
                    construct_cards.push(inst.clone());
                } else {
                    basic_cards.push(inst.clone());
                }
            }
        }
    }

    // --- 再次洗牌各组 ---
    faction_cards.shuffle(&mut rng);
    career_cards.shuffle(&mut rng);
    construct_cards.shuffle(&mut rng);
    basic_cards.shuffle(&mut rng);

    // --- 分配至玩家牌堆 ---
    let mut player_decks: Vec<Vec<RuntimeCardInstance>> = vec![Vec::new(); player_count];

    // 阵营卡: 每人 1 张
    for (i, card) in faction_cards.iter().enumerate() {
        let mut inst = card.clone();
        inst.owner = PlayerId(format!("P{}", (i % player_count) + 1));
        player_decks[i % player_count].push(inst);
    }

    // 职业卡: 每人 1 张
    for (i, card) in career_cards.iter().enumerate() {
        let mut inst = card.clone();
        inst.owner = PlayerId(format!("P{}", (i % player_count) + 1));
        player_decks[i % player_count].push(inst);
    }

    // 构筑卡: 每人分配 (总计80张 / 玩家数) 张
    let construct_per_player = construct_cards.len() / player_count;
    for (i, card) in construct_cards.iter().enumerate() {
        if i / construct_per_player >= player_count { break; }
        let mut inst = card.clone();
        inst.owner = PlayerId(format!("P{}", (i / construct_per_player) + 1));
        player_decks[i / construct_per_player].push(inst);
    }

    // 基本牌: 每人分配 (总计63张 / 玩家数) 张
    let basic_per_player = basic_cards.len() / player_count;
    for (i, card) in basic_cards.iter().enumerate() {
        if i / basic_per_player >= player_count { break; }
        let mut inst = card.clone();
        inst.owner = PlayerId(format!("P{}", (i / basic_per_player) + 1));
        player_decks[i / basic_per_player].push(inst);
    }

    // --- 每人牌堆 shuffle ---
    for deck in player_decks.iter_mut() {
        deck.shuffle(&mut rng);
    }

    Ok(DeckSetup {
        player_decks,
        all_instances: instances,
    })
}

// ============================================================================
// JSON 解析辅助
// ============================================================================

#[derive(serde::Deserialize)]
struct Distribution {
    entries: Vec<DistributionEntry>,
}

#[derive(serde::Deserialize)]
struct DistributionEntry {
    #[allow(dead_code)]
    category: String,
    #[allow(dead_code)]
    name: String,
    id: String,
    count: u32,
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn cards_dir() -> PathBuf {
        // CARGO_MANIFEST_DIR = .../builds/0.10.0/src-tauri/crates/infra
        // Go up 3 levels to package root, then cards/
        let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let root = manifest.parent().unwrap() // crates/
                        .parent().unwrap() // src-tauri/
                        .parent().unwrap(); // 0.10.0/
        root.join("cards")
    }

    #[test]
    fn test_factory_creates_instances() {
        let dir = cards_dir();
        let setup = build_decks(&dir, 2).expect("factory failed");
        assert!(!setup.all_instances.is_empty(), "No instances created");
    }

    #[test]
    fn test_factory_deck_sizes() {
        let dir = cards_dir();
        let setup = build_decks(&dir, 2).expect("factory failed");
        assert_eq!(setup.player_decks.len(), 2);
        for deck in &setup.player_decks {
            assert!(!deck.is_empty(), "Player deck must not be empty");
        }
    }

    #[test]
    fn test_factory_all_instances_have_owner() {
        let dir = cards_dir();
        let setup = build_decks(&dir, 4).expect("factory failed");
        for deck in &setup.player_decks {
            for inst in deck {
                assert_ne!(inst.owner.0, "unassigned");
            }
        }
    }

    #[test]
    fn test_factory_invalid_player_count() {
        let dir = cards_dir();
        let result = build_decks(&dir, 1);
        assert!(result.is_err());
    }
}
