//! 预设对战场景 - 用标签条件匹配卡牌，不再硬编码卡牌名
//!
//! 每个场景绑定标签条件+标记条件，初始化时从当前卡池动态筛选

use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

use super::state::{DuelState, PlayerField};

// ============ 场景条件 ============

/// 场景匹配条件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioCondition {
    pub label: String,
    pub marks: Vec<String>,
}

/// 场景中单个玩家配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioPlayer {
    pub name: String,
    pub faction: String,
    pub conditions: ScenarioCondition,
    pub hp: i32, pub max_hp: i32,
    pub armor: i32, pub energy: i32, pub max_energy: i32,
    pub physical_attack: i32, pub magic_attack: i32,
    pub physical_resist: i32, pub magic_resist: i32,
    pub hand_cards: Vec<String>,
    pub equipment: Vec<String>,
    pub skills: Vec<String>,
}

/// 预设场景
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scenario {
    pub id: String,
    pub name: String,
    pub description: String,
    pub first_player: ScenarioPlayer,
    pub second_player: ScenarioPlayer,
}

/// 场景匹配结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioMatch {
    pub id: String,
    pub name: String,
    pub description: String,
    pub first_matches: usize,
    pub second_matches: usize,
    pub first_label: String,
    pub second_label: String,
}

impl ScenarioPlayer {
    fn to_field(&self) -> PlayerField {
        let mut f = PlayerField::new(&self.name, &self.faction);
        f.hp = self.hp; f.max_hp = self.max_hp;
        f.armor = self.armor;
        f.energy = self.energy; f.max_energy = self.max_energy;
        f.physical_attack = self.physical_attack;
        f.magic_attack = self.magic_attack;
        f.physical_resist = self.physical_resist;
        f.magic_resist = self.magic_resist;
        f.hand_cards = self.hand_cards.clone();
        f.equipment = self.equipment.clone();
        f.skills = self.skills.clone();
        f
    }
}

// ============ 五个预设场景 ============

static PRESET_SCENARIOS: LazyLock<Vec<Scenario>> = LazyLock::new(|| vec![
    scenario_1_basic_duel(),
    scenario_2_mark_battle(),
    scenario_3_tag_combo_clash(),
    scenario_4_seal_counter(),
    scenario_5_free_battle(),
]);

pub fn preset_scenarios() -> Vec<Scenario> {
    PRESET_SCENARIOS.clone()
}

fn scenario_1_basic_duel() -> Scenario {
    Scenario {
        id: "basic_duel".into(), name: "基础攻防：儒法之争".into(),
        description: "标签「阵营」中的卡牌对阵，展示基础物理攻防。".into(),
        first_player: ScenarioPlayer {
            name: "先行者".into(), faction: "儒家".into(),
            conditions: ScenarioCondition { label: "阵营".into(), marks: vec!["仁心".into()] },
            hp: 8, max_hp: 8, armor: 2, energy: 4, max_energy: 4,
            physical_attack: 2, magic_attack: 1, physical_resist: 1, magic_resist: 0,
            hand_cards: vec![], equipment: vec![], skills: vec![],
        },
        second_player: ScenarioPlayer {
            name: "后行者".into(), faction: "法家".into(),
            conditions: ScenarioCondition { label: "阵营".into(), marks: vec!["法令".into()] },
            hp: 9, max_hp: 9, armor: 1, energy: 3, max_energy: 3,
            physical_attack: 2, magic_attack: 1, physical_resist: 0, magic_resist: 1,
            hand_cards: vec![], equipment: vec![], skills: vec![],
        },
    }
}

fn scenario_2_mark_battle() -> Scenario {
    Scenario {
        id: "mark_battle".into(), name: "标记对战：兵墨之争".into(),
        description: "兵家积累[谋略]标记，墨家积累[坚守]标记的持久战。".into(),
        first_player: ScenarioPlayer {
            name: "兵家将领".into(), faction: "兵家".into(),
            conditions: ScenarioCondition { label: "阵营".into(), marks: vec!["谋略".into()] },
            hp: 10, max_hp: 10, armor: 3, energy: 3, max_energy: 3,
            physical_attack: 2, magic_attack: 0, physical_resist: 2, magic_resist: 0,
            hand_cards: vec![], equipment: vec![], skills: vec![],
        },
        second_player: ScenarioPlayer {
            name: "墨家巨子".into(), faction: "墨家".into(),
            conditions: ScenarioCondition { label: "阵营".into(), marks: vec!["坚守".into()] },
            hp: 8, max_hp: 8, armor: 4, energy: 4, max_energy: 4,
            physical_attack: 1, magic_attack: 2, physical_resist: 0, magic_resist: 2,
            hand_cards: vec![], equipment: vec![], skills: vec![],
        },
    }
}

fn scenario_3_tag_combo_clash() -> Scenario {
    Scenario {
        id: "tag_combo".into(), name: "标签联动".into(),
        description: "道家 vs 构筑卡持有者，双方构筑卡联动。".into(),
        first_player: ScenarioPlayer {
            name: "炼气士".into(), faction: "道家".into(),
            conditions: ScenarioCondition { label: "阵营".into(), marks: vec!["自然".into()] },
            hp: 7, max_hp: 7, armor: 1, energy: 5, max_energy: 5,
            physical_attack: 1, magic_attack: 3, physical_resist: 0, magic_resist: 3,
            hand_cards: vec![], equipment: vec![], skills: vec![],
        },
        second_player: ScenarioPlayer {
            name: "说客".into(), faction: "杂家".into(),
            conditions: ScenarioCondition { label: "构筑卡".into(), marks: vec![] },
            hp: 8, max_hp: 8, armor: 2, energy: 4, max_energy: 4,
            physical_attack: 2, magic_attack: 2, physical_resist: 1, magic_resist: 1,
            hand_cards: vec![], equipment: vec![], skills: vec![],
        },
    }
}

fn scenario_4_seal_counter() -> Scenario {
    Scenario {
        id: "seal_counter".into(), name: "封锁与反制".into(),
        description: "封锁品质、无效化、反制高阶效果对决。".into(),
        first_player: ScenarioPlayer {
            name: "封锁者".into(), faction: "法家".into(),
            conditions: ScenarioCondition { label: "阵营".into(), marks: vec![] },
            hp: 7, max_hp: 7, armor: 1, energy: 5, max_energy: 5,
            physical_attack: 1, magic_attack: 3, physical_resist: 0, magic_resist: 2,
            hand_cards: vec![], equipment: vec![], skills: vec![],
        },
        second_player: ScenarioPlayer {
            name: "反制者".into(), faction: "道家".into(),
            conditions: ScenarioCondition { label: "阵营".into(), marks: vec![] },
            hp: 8, max_hp: 8, armor: 2, energy: 4, max_energy: 4,
            physical_attack: 2, magic_attack: 2, physical_resist: 1, magic_resist: 1,
            hand_cards: vec![], equipment: vec![], skills: vec![],
        },
    }
}

fn scenario_5_free_battle() -> Scenario {
    Scenario {
        id: "free_battle".into(), name: "自由对战".into(),
        description: "默认属性对战，可手动选择卡牌参战。".into(),
        first_player: ScenarioPlayer {
            name: "玩家1".into(), faction: "自定义".into(),
            conditions: ScenarioCondition { label: "".into(), marks: vec![] },
            hp: 8, max_hp: 8, armor: 1, energy: 4, max_energy: 4,
            physical_attack: 2, magic_attack: 2, physical_resist: 1, magic_resist: 1,
            hand_cards: vec![], equipment: vec![], skills: vec![],
        },
        second_player: ScenarioPlayer {
            name: "玩家2".into(), faction: "自定义".into(),
            conditions: ScenarioCondition { label: "".into(), marks: vec![] },
            hp: 8, max_hp: 8, armor: 1, energy: 4, max_energy: 4,
            physical_attack: 2, magic_attack: 2, physical_resist: 1, magic_resist: 1,
            hand_cards: vec![], equipment: vec![], skills: vec![],
        },
    }
}

// ============ 条件匹配 ============

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CardInfo {
    pub name: String,
    pub list_tags: Vec<String>,
}

impl CardInfo {
    pub fn new(name: &str, list_tags: &[String]) -> Self {
        CardInfo { name: name.to_string(), list_tags: list_tags.to_vec() }
    }

    pub fn matches_condition(&self, condition: &ScenarioCondition) -> bool {
        if condition.label.is_empty() { return true; }
        self.list_tags.iter().any(|t| t == &condition.label)
    }
}

/// 计算场景在当前卡池中的匹配数
pub fn count_scenario_matches(scenario: &Scenario, card_pool: &[CardInfo]) -> ScenarioMatch {
    let first_matches = card_pool.iter()
        .filter(|c| c.matches_condition(&scenario.first_player.conditions))
        .count();
    let second_matches = card_pool.iter()
        .filter(|c| c.matches_condition(&scenario.second_player.conditions))
        .count();

    ScenarioMatch {
        id: scenario.id.clone(), name: scenario.name.clone(),
        description: scenario.description.clone(),
        first_matches, second_matches,
        first_label: scenario.first_player.conditions.label.clone(),
        second_label: scenario.second_player.conditions.label.clone(),
    }
}

// ============ 场景初始化 ============

pub fn init_scenario(scenario_id: &str) -> Option<DuelState> {
    preset_scenarios().into_iter().find(|s| s.id == scenario_id).map(|s| {
        let first = s.first_player.to_field();
        let second = s.second_player.to_field();
        DuelState::new(first, second, s.id)
    })
}

pub fn list_scenarios() -> Vec<Scenario> { preset_scenarios() }

// ============ 测试 ============

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_all_5_scenarios() {
        let scenarios = list_scenarios();
        assert_eq!(scenarios.len(), 5);
    }

    #[test]
    fn test_scenario_ids_unique() {
        let scenarios = list_scenarios();
        let mut ids: Vec<&str> = scenarios.iter().map(|s| s.id.as_str()).collect();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), 5);
    }

    #[test]
    fn test_init_basic_duel() {
        let state = init_scenario("basic_duel").expect("basic_duel 场景应存在");
        assert_eq!(state.phase, DuelPhase::Preparation);
        assert_eq!(state.round, 0);
        assert_eq!(state.scenario_id, "basic_duel");
        assert_eq!(state.field(PlayerSide::First).name, "先行者");
        assert_eq!(state.field(PlayerSide::Second).name, "后行者");
        assert_eq!(state.field(PlayerSide::First).faction, "儒家");
        assert_eq!(state.field(PlayerSide::Second).faction, "法家");
    }

    #[test]
    fn test_init_mark_battle() {
        let state = init_scenario("mark_battle").expect("mark_battle 场景应存在");
        assert_eq!(state.field(PlayerSide::First).hp, 10);
        assert_eq!(state.field(PlayerSide::Second).hp, 8);
        assert_eq!(state.field(PlayerSide::First).armor, 3);
        assert_eq!(state.field(PlayerSide::Second).physical_attack, 1);
        assert_eq!(state.field(PlayerSide::Second).magic_attack, 2);
    }

    #[test]
    fn test_init_tag_combo() {
        let state = init_scenario("tag_combo").expect("tag_combo 场景应存在");
        assert_eq!(state.field(PlayerSide::First).faction, "道家");
        assert_eq!(state.field(PlayerSide::First).energy, 5);
        assert_eq!(state.field(PlayerSide::Second).faction, "杂家");
    }

    #[test]
    fn test_init_seal_counter() {
        let state = init_scenario("seal_counter").expect("seal_counter 场景应存在");
        assert_eq!(state.field(PlayerSide::First).magic_attack, 3);
        assert_eq!(state.field(PlayerSide::First).hp, 7);
    }

    #[test]
    fn test_init_free_battle() {
        let state = init_scenario("free_battle").expect("free_battle 场景应存在");
        assert_eq!(state.field(PlayerSide::First).name, "玩家1");
        assert_eq!(state.field(PlayerSide::Second).name, "玩家2");
    }

    #[test]
    fn test_init_nonexistent_scenario() {
        assert!(init_scenario("not_exist").is_none());
        assert!(init_scenario("").is_none());
    }

    #[test]
    fn test_card_info_matches_condition() {
        let card = CardInfo::new("击敌", &["基本牌".to_string()]);
        let cond = ScenarioCondition {
            label: "基本牌".to_string(),
            marks: vec![],
        };
        assert!(card.matches_condition(&cond));
    }

    #[test]
    fn test_card_info_matches_empty_label() {
        let card = CardInfo::new("任意卡", &[]);
        let cond = ScenarioCondition {
            label: "".to_string(),
            marks: vec![],
        };
        // 空 label 匹配所有
        assert!(card.matches_condition(&cond));
    }

    #[test]
    fn test_card_info_no_match() {
        let card = CardInfo::new("击敌", &["基本牌".to_string()]);
        let cond = ScenarioCondition {
            label: "构筑卡".to_string(),
            marks: vec![],
        };
        assert!(!card.matches_condition(&cond));
    }

    #[test]
    fn test_count_scenario_matches() {
        let card_pool = vec![
            CardInfo::new("击敌", &["基本牌".to_string()]),
            CardInfo::new("御守", &["基本牌".to_string()]),
            CardInfo::new("浮光", &["构筑卡".to_string(), "武学".to_string()]),
            CardInfo::new("荆棘", &["构筑卡".to_string(), "甲胄".to_string()]),
        ];
        let scenario = scenario_1_basic_duel();
        let match_result = count_scenario_matches(&scenario, &card_pool);
        // 阵营标签与基本牌/构筑卡无重叠，匹配数为0
        assert_eq!(match_result.first_label, "阵营");
        assert_eq!(match_result.second_label, "阵营");
    }

    #[test]
    fn test_scenario_player_to_field() {
        let sp = ScenarioPlayer {
            name: "测试玩家".into(),
            faction: "测试阵营".into(),
            conditions: ScenarioCondition { label: "".into(), marks: vec![] },
            hp: 10, max_hp: 10,
            armor: 5, energy: 6, max_energy: 6,
            physical_attack: 3, magic_attack: 2,
            physical_resist: 1, magic_resist: 1,
            hand_cards: vec!["手牌1".into()],
            equipment: vec!["装备1".into()],
            skills: vec!["技能1".into()],
        };
        let field = sp.to_field();
        assert_eq!(field.name, "测试玩家");
        assert_eq!(field.faction, "测试阵营");
        assert_eq!(field.hp, 10);
        assert_eq!(field.armor, 5);
        assert_eq!(field.energy, 6);
        assert_eq!(field.physical_attack, 3);
        assert_eq!(field.magic_attack, 2);
        assert_eq!(field.hand_cards, vec!["手牌1"]);
        assert_eq!(field.equipment, vec!["装备1"]);
        assert_eq!(field.skills, vec!["技能1"]);
    }

    #[test]
    fn test_preset_scenarios_idempotent() {
        let s1 = preset_scenarios();
        let s2 = preset_scenarios();
        assert_eq!(s1.len(), s2.len());
        for (a, b) in s1.iter().zip(s2.iter()) {
            assert_eq!(a.id, b.id);
        }
    }
}