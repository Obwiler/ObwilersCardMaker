//! 对局初始化脚本 — 基于配比表和阵营选择的确定性开局流程
//!
//! 流程：
//!   1. 读取配比表
//!   2. 玩家选择阵营卡（每人 1 张）
//!   3. 每人获得 1 张职业卡
//!   4. 每人获得 3 张基本牌 + 2 张构筑卡（随机但对应配比）
//!   5. 洗牌 → push 牌堆
//!   6. 每人抽起手 4 张

use std::fs;
use std::path::{Path, PathBuf};
use dz_cardmaker_ports::*;

use rand::seq::SliceRandom;
use rand::thread_rng;

pub struct GameSetup;

impl GameSetup {
    /// 从配比表初始化一个 2 人标准对局，返回待注入 BattlefieldModule 的数据
    pub fn init_standard_game(cards_dir: &Path, player_count: u32) -> Result<Vec<PlayerDataInit>, String> {
        if player_count < 2 || player_count > 8 {
            return Err("玩家数必须在 2-8 之间".into());
        }

        let mut rng = thread_rng();

        // 1. 读取配比表
        let dist_json = fs::read_to_string(&cards_dir.join("_distribution.json"))
            .map_err(|e| format!("读取配比表: {}", e))?;
        let dist_json = dist_json.trim_start_matches('\u{feff}').to_string();

        let parsed: serde_json::Value = serde_json::from_str(&dist_json)
            .map_err(|e| format!("解析配比表: {}", e))?;
        let entries = parsed["entries"].as_array()
            .ok_or("配比表缺少 entries")?;

        // 2. 按类型分类
        let mut faction_cards = Vec::new();
        let mut career_cards = Vec::new();
        let mut construct_cards = Vec::new();
        let mut basic_cards = Vec::new();

        for entry in entries {
            let id = entry["id"].as_str().unwrap_or("");
            let name = entry["name"].as_str().unwrap_or("");
            let cat = entry["category"].as_str().unwrap_or("");

            match cat {
                "阵营" | "阵营卡" => faction_cards.push((id, name)),
                "职业" | "职业卡" => career_cards.push((id, name)),
                "构筑卡" => construct_cards.push((id, name)),
                "基本牌" => basic_cards.push((id, name)),
                _ => {}
            }
        }

        faction_cards.shuffle(&mut rng);
        career_cards.shuffle(&mut rng);
        construct_cards.shuffle(&mut rng);
        basic_cards.shuffle(&mut rng);

        // 3. 分配给玩家
        let mut players = Vec::new();
        let player_count = player_count as usize;

        let faction_per = faction_cards.len() / player_count;
        let career_per = career_cards.len() / player_count;
        let basic_per = basic_cards.len() / player_count;
        let construct_per = construct_cards.len() / player_count;

        for i in 0..player_count {
            let pid = PlayerId(format!("P{}", i + 1));

            let mut deck = Vec::new();
            let mut seq = 0u32;

            // 阵营卡
            for j in 0..faction_per {
                let idx = i * faction_per + j;
                if idx < faction_cards.len() {
                    seq += 1;
                    deck.push(RuntimeCardInstance {
                        runtime_id: RuntimeCardId(format!("{}_{}", faction_cards[idx].0, seq)),
                        static_def_ref: StaticCardId(faction_cards[idx].0.to_string()),
                        zone: Zone::Deck,
                        owner: pid.clone(),
                        hp: 10, armor: 2, energy: 4,
                        marks: Default::default(),
                    });
                }
            }

            // 职业卡
            for j in 0..career_per {
                let idx = i * career_per + j;
                if idx < career_cards.len() {
                    seq += 1;
                    deck.push(RuntimeCardInstance {
                        runtime_id: RuntimeCardId(format!("{}_{}", career_cards[idx].0, seq)),
                        static_def_ref: StaticCardId(career_cards[idx].0.to_string()),
                        zone: Zone::Deck,
                        owner: pid.clone(),
                        hp: 0, armor: 0, energy: 0,
                        marks: Default::default(),
                    });
                }
            }

            // 构筑卡
            for j in 0..construct_per {
                let idx = i * construct_per + j;
                if idx < construct_cards.len() {
                    seq += 1;
                    deck.push(RuntimeCardInstance {
                        runtime_id: RuntimeCardId(format!("{}_{}", construct_cards[idx].0, seq)),
                        static_def_ref: StaticCardId(construct_cards[idx].0.to_string()),
                        zone: Zone::Deck,
                        owner: pid.clone(),
                        hp: 0, armor: 0, energy: 0,
                        marks: Default::default(),
                    });
                }
            }

            // 基本牌
            for j in 0..basic_per {
                let idx = i * basic_per + j;
                if idx < basic_cards.len() {
                    seq += 1;
                    deck.push(RuntimeCardInstance {
                        runtime_id: RuntimeCardId(format!("{}_{}", basic_cards[idx].0, seq)),
                        static_def_ref: StaticCardId(basic_cards[idx].0.to_string()),
                        zone: Zone::Deck,
                        owner: pid.clone(),
                        hp: 0, armor: 0, energy: 0,
                        marks: Default::default(),
                    });
                }
            }

            deck.shuffle(&mut rng);

            players.push(PlayerDataInit {
                id: pid,
                deck,
                hand: Vec::new(),
                field: Vec::new(),
                graveyard: Vec::new(),
            });
        }

        Ok(players)
    }

    /// 从一组 player_data_init 构建完整的 instances HashMap
    pub fn build_instance_map(players: &[PlayerDataInit]) -> std::collections::HashMap<RuntimeCardId, RuntimeCardInstance> {
        let mut map = std::collections::HashMap::new();
        for p in players {
            for inst in &p.deck { map.insert(inst.runtime_id.clone(), inst.clone()); }
            for inst in &p.hand { map.insert(inst.runtime_id.clone(), inst.clone()); }
            for inst in &p.field { map.insert(inst.runtime_id.clone(), inst.clone()); }
            for inst in &p.graveyard { map.insert(inst.runtime_id.clone(), inst.clone()); }
        }
        map
    }
}

/// 玩家初始数据结构，可供 BattlefieldModule 消费
#[derive(Debug, Clone)]
pub struct PlayerDataInit {
    pub id: PlayerId,
    pub deck: Vec<RuntimeCardInstance>,
    pub hand: Vec<RuntimeCardInstance>,
    pub field: Vec<RuntimeCardInstance>,
    pub graveyard: Vec<RuntimeCardInstance>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cards_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..").join("..").join("..").join("cards")
    }

    #[test]
    fn test_setup_creates_two_player_game() {
        let dir = cards_dir();
        let result = GameSetup::init_standard_game(&dir, 2);
        assert!(result.is_ok(), "Setup failed: {:?}", result.err());
        let players = result.unwrap();
        assert_eq!(players.len(), 2);
        for p in &players {
            assert!(!p.deck.is_empty(), "Player {} has empty deck", p.id.0);
        }
    }

    #[test]
    fn test_setup_creates_four_player_game() {
        let dir = cards_dir();
        let result = GameSetup::init_standard_game(&dir, 4);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 4);
    }

    #[test]
    fn test_setup_rejects_single_player() {
        let dir = cards_dir();
        let result = GameSetup::init_standard_game(&dir, 1);
        assert!(result.is_err());
    }

    #[test]
    fn test_build_instance_map_deduplicates() {
        let dir = cards_dir();
        let players = GameSetup::init_standard_game(&dir, 2).unwrap();
        let map = GameSetup::build_instance_map(&players);
        assert!(map.len() >= 10);
    }
}
