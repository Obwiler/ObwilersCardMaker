//! 对峙状态机 - DuelPhase 枚举、DuelState 结构体、状态转换
//!
//! 对峙流程：
//!   准备阶段 → 先手回合 → 后手回合 → 结算阶段 → 结束
//!
//! 每个回合包含双方各自的攻击流程。

use serde::{Deserialize, Serialize};

// ============ 统一类型（来自 core）============

pub use core::PlayerSide;
pub use core::DamageType;

// ============ 阶段枚举 ============

/// 对峙阶段
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DuelPhase {
    /// 准备阶段：确定先手、初始化场地
    Preparation,
    /// 先手回合：先手玩家执行攻击与效果
    FirstPlayerTurn,
    /// 后手回合：后手玩家执行攻击与效果
    SecondPlayerTurn,
    /// 结算阶段：结算回合结束效果、标记过期
    Settlement,
    /// 对峙结束：胜负已分
    End,
}

impl DuelPhase {
    pub fn name(&self) -> &'static str {
        match self {
            DuelPhase::Preparation => "准备阶段",
            DuelPhase::FirstPlayerTurn => "先手回合",
            DuelPhase::SecondPlayerTurn => "后手回合",
            DuelPhase::Settlement => "结算阶段",
            DuelPhase::End => "结束",
        }
    }

    /// 获取下一个阶段
    pub fn next(&self) -> Option<DuelPhase> {
        match self {
            DuelPhase::Preparation => Some(DuelPhase::FirstPlayerTurn),
            DuelPhase::FirstPlayerTurn => Some(DuelPhase::SecondPlayerTurn),
            DuelPhase::SecondPlayerTurn => Some(DuelPhase::Settlement),
            DuelPhase::Settlement => Some(DuelPhase::End),
            DuelPhase::End => None,
        }
    }
}

// ============ 场地状态 ============

/// 单个玩家的场地状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerField {
    /// 玩家名称
    pub name: String,
    /// 阵营 (如"儒家")
    pub faction: String,
    /// 当前生命值
    pub hp: i32,
    /// 最大生命值
    pub max_hp: i32,
    /// 护甲值
    pub armor: i32,
    /// 技力值
    pub energy: i32,
    /// 技力上限
    pub max_energy: i32,
    /// 物理攻击力
    pub physical_attack: i32,
    /// 法术攻击力
    pub magic_attack: i32,
    /// 物理抗性
    pub physical_resist: i32,
    /// 法术抗性
    pub magic_resist: i32,
    /// 本回合是否已攻击
    pub has_attacked: bool,
    /// 剩余攻击次数
    pub attack_count: i32,
    /// 当前手牌
    pub hand_cards: Vec<String>,
    /// 装备区卡牌
    pub equipment: Vec<String>,
    /// 技能区卡牌
    pub skills: Vec<String>,
    /// 激活标记 (标记名 → 层数)
    pub marks: std::collections::HashMap<String, i32>,
    /// 已使用的标签引用
    pub used_tags: Vec<String>,
    /// 本回合已造成的伤害量
    pub damage_dealt_this_turn: i32,
    /// 本回合已恢复的生命量
    pub healed_this_turn: i32,
}

impl PlayerField {
    pub fn new(name: &str, faction: &str) -> Self {
        PlayerField {
            name: name.to_string(),
            faction: faction.to_string(),
            hp: 8,
            max_hp: 8,
            armor: 2,
            energy: 4,
            max_energy: 4,
            physical_attack: 1,
            magic_attack: 0,
            physical_resist: 0,
            magic_resist: 0,
            has_attacked: false,
            attack_count: 1,
            hand_cards: vec![],
            equipment: vec![],
            skills: vec![],
            marks: std::collections::HashMap::new(),
            used_tags: vec![],
            damage_dealt_this_turn: 0,
            healed_this_turn: 0,
        }
    }

    /// 检查是否存活
    pub fn is_alive(&self) -> bool {
        self.hp > 0
    }

    /// 受到伤害（先扣护甲再扣生命）
    pub fn take_damage(&mut self, amount: i32, _dtype: DamageType) -> i32 {
        if amount <= 0 {
            return 0;
        }
        let mut remaining = amount;

        // 先扣护甲
        if self.armor > 0 {
            let absorbed = self.armor.min(remaining);
            self.armor -= absorbed;
            remaining -= absorbed;
        }

        // 再扣生命
        if remaining > 0 {
            self.hp = (self.hp - remaining).max(0);
        }

        amount - remaining // 实际造成伤害量
    }

    /// 恢复生命
    pub fn heal(&mut self, amount: i32) -> i32 {
        if amount <= 0 {
            return 0;
        }
        let actual = amount.min(self.max_hp - self.hp);
        self.hp += actual;
        self.healed_this_turn += actual;
        actual
    }

    /// 获得护甲
    pub fn gain_armor(&mut self, amount: i32) {
        self.armor += amount;
    }

    /// 获得/消耗技力
    pub fn modify_energy(&mut self, delta: i32) {
        self.energy = (self.energy + delta).clamp(0, self.max_energy);
    }

    /// 获得标记
    pub fn add_mark(&mut self, name: &str, count: i32) {
        let entry = self.marks.entry(name.to_string()).or_insert(0);
        *entry += count;
    }

    /// 消耗标记
    pub fn consume_marks(&mut self, name: &str, count: i32) -> bool {
        if let Some(current) = self.marks.get_mut(name) {
            if *current >= count {
                *current -= count;
                if *current <= 0 {
                    self.marks.remove(name);
                }
                return true;
            }
        }
        false
    }

    /// 获取标记层数
    pub fn mark_count(&self, name: &str) -> i32 {
        self.marks.get(name).copied().unwrap_or(0)
    }
}

// ============ 效果栈条目 ============

/// 效果栈中的单个条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectStackEntry {
    /// 效果来源卡牌名
    pub source: String,
    /// 效果描述
    pub description: String,
    /// 发起方
    pub owner: PlayerSide,
    /// 目标方
    pub target: PlayerSide,
}

// ============ 对峙状态 ============

/// 对峙全局状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuelState {
    /// 当前阶段
    pub phase: DuelPhase,
    /// 当前回合数（每完成一次先手+后手+结算，回合数+1）
    pub round: u32,
    /// 先手方（First）vs 后手方（Second）
    pub first_player: usize,
    pub second_player: usize,
    /// 双方场地状态 [先手方, 后手方]
    pub fields: [PlayerField; 2],
    /// 当前行动方
    pub active_player: PlayerSide,
    /// 效果栈 (LIFO)
    pub effect_stack: Vec<EffectStackEntry>,
    /// 效果日志
    pub effect_log: Vec<EffectLogEntry>,
    /// 胜负结果
    pub result: Option<DuelResult>,
    /// 场景 ID
    pub scenario_id: String,
}

/// 效果日志条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectLogEntry {
    /// 回合号
    pub round: u32,
    /// 阶段
    pub phase: String,
    /// 来源
    pub source: String,
    /// 描述
    pub description: String,
    /// 发起方
    pub owner: String,
}

/// 对峙结果
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DuelResult {
    /// 先手方获胜
    FirstPlayerWin,
    /// 后手方获胜
    SecondPlayerWin,
    /// 平局
    Draw,
}

impl DuelResult {
    pub fn description(&self) -> &'static str {
        match self {
            DuelResult::FirstPlayerWin => "先手方获胜",
            DuelResult::SecondPlayerWin => "后手方获胜",
            DuelResult::Draw => "平局",
        }
    }
}

// ============ 状态转换函数 ============

impl DuelState {
    /// 创建新的对峙状态
    pub fn new(
        first: PlayerField,
        second: PlayerField,
        scenario_id: String,
    ) -> Self {
        DuelState {
            phase: DuelPhase::Preparation,
            round: 0,
            first_player: 0,
            second_player: 1,
            fields: [first, second],
            active_player: PlayerSide::First,
            effect_stack: vec![],
            effect_log: vec![],
            result: None,
            scenario_id,
        }
    }

    /// 获取指定方的场地引用
    pub fn field(&self, side: PlayerSide) -> &PlayerField {
        &self.fields[side as usize]
    }

    /// 获取指定方的场地可变引用
    pub fn field_mut(&mut self, side: PlayerSide) -> &mut PlayerField {
        &mut self.fields[side as usize]
    }

    /// 获取行动方场地
    pub fn active_field(&self) -> &PlayerField {
        self.field(self.active_player)
    }

    /// 获取行动方对手场地
    pub fn opponent_field(&self) -> &PlayerField {
        self.field(self.active_player.opponent())
    }

    /// 获取行动方可变场地
    pub fn active_field_mut(&mut self) -> &mut PlayerField {
        self.field_mut(self.active_player)
    }

    /// 获取对手可变场地
    pub fn opponent_field_mut(&mut self) -> &mut PlayerField {
        self.field_mut(self.active_player.opponent())
    }

    /// 推进到下一个阶段
    pub fn advance_phase(&mut self) -> Option<DuelPhase> {
        let next = self.phase.next();
        if let Some(p) = next {
            self.phase = p;
            self.on_phase_enter(p);
        }
        next
    }

    /// 阶段进入时的初始化
    pub fn on_phase_enter(&mut self, phase: DuelPhase) {
        match phase {
            DuelPhase::Preparation => {
                self.round = 0;
                self.active_player = PlayerSide::First;
            }
            DuelPhase::FirstPlayerTurn => {
                self.round = self.round.max(1);
                self.active_player = PlayerSide::First;
                // 重置回合状态
                self.field_mut(PlayerSide::First).has_attacked = false;
                self.field_mut(PlayerSide::First).attack_count = 1;
                self.field_mut(PlayerSide::First).damage_dealt_this_turn = 0;
                self.field_mut(PlayerSide::First).healed_this_turn = 0;
            }
            DuelPhase::SecondPlayerTurn => {
                self.active_player = PlayerSide::Second;
                self.field_mut(PlayerSide::Second).has_attacked = false;
                self.field_mut(PlayerSide::Second).attack_count = 1;
                self.field_mut(PlayerSide::Second).damage_dealt_this_turn = 0;
                self.field_mut(PlayerSide::Second).healed_this_turn = 0;
            }
            DuelPhase::Settlement => {
                // 结算阶段不设 active_player
                self.active_player = PlayerSide::First;
            }
            DuelPhase::End => {
                // 判定结果
                self.resolve_result();
            }
        }
    }

    /// 判定胜负
    fn resolve_result(&mut self) {
        let first_alive = self.field(PlayerSide::First).is_alive();
        let second_alive = self.field(PlayerSide::Second).is_alive();

        self.result = Some(match (first_alive, second_alive) {
            (true, false) => DuelResult::FirstPlayerWin,
            (false, true) => DuelResult::SecondPlayerWin,
            _ => DuelResult::Draw,
        });
    }

    /// 检查是否应立即结束（一方死亡）
    pub fn check_end(&mut self) -> bool {
        if !self.field(PlayerSide::First).is_alive() || !self.field(PlayerSide::Second).is_alive() {
            self.phase = DuelPhase::End;
            self.resolve_result();
            true
        } else {
            false
        }
    }

    /// 添加效果日志
    pub fn log_effect(&mut self, source: &str, description: &str, owner: PlayerSide) {
        self.effect_log.push(EffectLogEntry {
            round: self.round,
            phase: self.phase.name().to_string(),
            source: source.to_string(),
            description: description.to_string(),
            owner: owner.name().to_string(),
        });
    }

    /// 将效果推入栈
    pub fn push_effect(&mut self, entry: EffectStackEntry) {
        self.effect_stack.push(entry);
    }

    /// 弹出栈顶效果（LIFO）
    pub fn pop_effect(&mut self) -> Option<EffectStackEntry> {
        self.effect_stack.pop()
    }
}

// ============ 测试 ============

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_phase_transition() {
        let mut state = DuelState::new(
            PlayerField::new("玩家A", "儒家"),
            PlayerField::new("玩家B", "法家"),
            "test".into(),
        );

        assert_eq!(state.phase, DuelPhase::Preparation);

        // Preparation → FirstPlayerTurn
        state.advance_phase();
        assert_eq!(state.phase, DuelPhase::FirstPlayerTurn);
        assert_eq!(state.active_player, PlayerSide::First);
        assert_eq!(state.round, 1);

        // FirstPlayerTurn → SecondPlayerTurn
        state.advance_phase();
        assert_eq!(state.phase, DuelPhase::SecondPlayerTurn);
        assert_eq!(state.active_player, PlayerSide::Second);

        // SecondPlayerTurn → Settlement
        state.advance_phase();
        assert_eq!(state.phase, DuelPhase::Settlement);

        // Settlement → End
        state.advance_phase();
        assert_eq!(state.phase, DuelPhase::End);
        assert!(state.result.is_some());
    }

    #[test]
    fn test_take_damage_with_armor() {
        let mut field = PlayerField::new("测试", "墨家");
        field.hp = 9;
        field.armor = 2;

        let actual = field.take_damage(3, DamageType::Physical);
        assert_eq!(actual, 3); // 2 armor + 1 hp
        assert_eq!(field.armor, 0);
        assert_eq!(field.hp, 8);
    }

    #[test]
    fn test_take_damage_no_armor() {
        let mut field = PlayerField::new("测试", "兵家");
        field.hp = 6;
        field.armor = 0;

        let actual = field.take_damage(4, DamageType::Magical);
        assert_eq!(actual, 4);
        assert_eq!(field.hp, 2);
    }

    #[test]
    fn test_marks() {
        let mut field = PlayerField::new("测试", "儒家");
        field.add_mark("仁心", 2);
        assert_eq!(field.mark_count("仁心"), 2);

        let ok = field.consume_marks("仁心", 1);
        assert!(ok);
        assert_eq!(field.mark_count("仁心"), 1);

        let fail = field.consume_marks("仁心", 2);
        assert!(!fail);
        assert_eq!(field.mark_count("仁心"), 1);

        field.consume_marks("仁心", 1);
        assert_eq!(field.mark_count("仁心"), 0);
    }

    // ============ 效果栈 LIFO ============

    #[test]
    fn test_effect_stack_lifo() {
        let mut state = DuelState::new(
            PlayerField::new("A", "儒家"),
            PlayerField::new("B", "法家"),
            "test".into(),
        );

        state.push_effect(EffectStackEntry {
            source: "卡牌1".into(),
            description: "效果1".into(),
            owner: PlayerSide::First,
            target: PlayerSide::Second,
        });
        state.push_effect(EffectStackEntry {
            source: "卡牌2".into(),
            description: "效果2".into(),
            owner: PlayerSide::Second,
            target: PlayerSide::First,
        });
        state.push_effect(EffectStackEntry {
            source: "卡牌3".into(),
            description: "效果3".into(),
            owner: PlayerSide::First,
            target: PlayerSide::Second,
        });

        // LIFO: 后入先出
        let e3 = state.pop_effect().unwrap();
        assert_eq!(e3.source, "卡牌3");
        let e2 = state.pop_effect().unwrap();
        assert_eq!(e2.source, "卡牌2");
        let e1 = state.pop_effect().unwrap();
        assert_eq!(e1.source, "卡牌1");
        assert!(state.pop_effect().is_none());
    }

    #[test]
    fn test_effect_stack_empty_pop() {
        let mut state = DuelState::new(
            PlayerField::new("A", "儒家"),
            PlayerField::new("B", "法家"),
            "test".into(),
        );
        assert!(state.pop_effect().is_none());
        assert!(state.pop_effect().is_none());
    }

    // ============ 状态机非法转换（End → next） ============

    #[test]
    fn test_phase_next_end_returns_none() {
        assert_eq!(DuelPhase::End.next(), None);
    }

    #[test]
    fn test_advance_from_end() {
        let mut state = DuelState::new(
            PlayerField::new("A", "儒家"),
            PlayerField::new("B", "法家"),
            "test".into(),
        );
        state.phase = DuelPhase::End;
        let result = state.advance_phase();
        assert_eq!(result, None);
        assert_eq!(state.phase, DuelPhase::End);
    }

    // ============ DuelResult ============

    #[test]
    fn test_duel_result_description() {
        assert_eq!(DuelResult::FirstPlayerWin.description(), "先手方获胜");
        assert_eq!(DuelResult::SecondPlayerWin.description(), "后手方获胜");
        assert_eq!(DuelResult::Draw.description(), "平局");
    }

    #[test]
    fn test_duel_result_serde() {
        let results = vec![DuelResult::FirstPlayerWin, DuelResult::SecondPlayerWin, DuelResult::Draw];
        for r in results {
            let json = serde_json::to_string(&r).unwrap();
            let restored: DuelResult = serde_json::from_str(&json).unwrap();
            assert_eq!(r, restored);
        }
    }

    // ============ PlayerSide ============

    #[test]
    fn test_player_side_opponent() {
        assert_eq!(PlayerSide::First.opponent(), PlayerSide::Second);
        assert_eq!(PlayerSide::Second.opponent(), PlayerSide::First);
    }

    #[test]
    fn test_player_side_name() {
        assert_eq!(PlayerSide::First.name(), "先手方");
        assert_eq!(PlayerSide::Second.name(), "后手方");
    }

    // ============ PlayerField 方法 ============

    #[test]
    fn test_field_is_alive() {
        let field = PlayerField::new("测试", "儒家");
        assert!(field.is_alive());
    }

    #[test]
    fn test_field_not_alive() {
        let mut field = PlayerField::new("测试", "儒家");
        field.hp = 0;
        assert!(!field.is_alive());
    }

    #[test]
    fn test_field_not_alive_negative() {
        let mut field = PlayerField::new("测试", "儒家");
        field.hp = -1;
        assert!(!field.is_alive());
    }

    #[test]
    fn test_take_damage_zero() {
        let mut field = PlayerField::new("测试", "儒家");
        field.hp = 8;
        let actual = field.take_damage(0, DamageType::Physical);
        assert_eq!(actual, 0);
        assert_eq!(field.hp, 8);
    }

    #[test]
    fn test_take_damage_negative() {
        let mut field = PlayerField::new("测试", "儒家");
        field.hp = 8;
        let actual = field.take_damage(-3, DamageType::Magical);
        assert_eq!(actual, 0);
        assert_eq!(field.hp, 8);
    }

    #[test]
    fn test_heal_max_cap() {
        let mut field = PlayerField::new("测试", "儒家");
        field.hp = 7;
        field.max_hp = 8;
        let actual = field.heal(5);
        assert_eq!(actual, 1);
        assert_eq!(field.hp, 8);
    }

    #[test]
    fn test_heal_zero() {
        let mut field = PlayerField::new("测试", "儒家");
        field.hp = 5;
        let actual = field.heal(0);
        assert_eq!(actual, 0);
        assert_eq!(field.hp, 5);
    }

    #[test]
    fn test_modify_energy_clamp() {
        let mut field = PlayerField::new("测试", "儒家");
        field.energy = 4;
        field.max_energy = 4;
        field.modify_energy(3);
        assert_eq!(field.energy, 4); // 不能超过上限
        field.modify_energy(-10);
        assert_eq!(field.energy, 0); // 不能低于 0
    }

    #[test]
    fn test_check_end_kill_first() {
        let mut state = DuelState::new(
            PlayerField::new("A", "儒家"),
            PlayerField::new("B", "法家"),
            "test".into(),
        );
        state.field_mut(PlayerSide::First).hp = 0;
        let ended = state.check_end();
        assert!(ended);
        assert_eq!(state.phase, DuelPhase::End);
        assert_eq!(state.result, Some(DuelResult::SecondPlayerWin));
    }

    #[test]
    fn test_check_end_kill_second() {
        let mut state = DuelState::new(
            PlayerField::new("A", "儒家"),
            PlayerField::new("B", "法家"),
            "test".into(),
        );
        state.field_mut(PlayerSide::Second).hp = 0;
        let ended = state.check_end();
        assert!(ended);
        assert_eq!(state.result, Some(DuelResult::FirstPlayerWin));
    }

    #[test]
    fn test_on_phase_enter_preparation_resets_round() {
        let mut state = DuelState::new(
            PlayerField::new("A", "儒家"),
            PlayerField::new("B", "法家"),
            "test".into(),
        );
        state.round = 5;
        state.on_phase_enter(DuelPhase::Preparation);
        assert_eq!(state.round, 0);
        assert_eq!(state.active_player, PlayerSide::First);
    }

    #[test]
    fn test_damage_type_separate_values() {
        assert_ne!(DamageType::Physical, DamageType::Magical);
        assert_ne!(DamageType::Magical, DamageType::True);
        assert_ne!(DamageType::True, DamageType::Physical);
    }
}
