//! 对峙执行器 - 先手/后手攻防流程、效果栈解析（LIFO）、条件判断器
//!
//! 流程：
//!   1. 先手回合：行动方使用攻击/技能 → 结算效果栈 → 切换至后手
//!   2. 后手回合：同上
//!   3. 结算阶段：回合结束效果、标记结算
//!   4. 效果栈基于 LIFO（后入先出）原则解析

use super::effect::{Effect, EffectType, TargetSelector, TriggerCondition};
use super::state::{
    DamageType, DuelPhase, DuelResult, DuelState, EffectLogEntry, PlayerSide,
};

/// 执行一整轮对峙（先手回合 → 后手回合 → 结算 → 检查结束）
/// 返回此轮执行的效果日志
pub fn execute_full_round(state: &mut DuelState) -> Vec<EffectLogEntry> {
    let mut round_log: Vec<EffectLogEntry> = vec![];

    // 先手回合
    if state.phase == DuelPhase::Preparation {
        state.advance_phase(); // → FirstPlayerTurn
    }
    if state.phase == DuelPhase::FirstPlayerTurn {
        let log = execute_player_turn(state, PlayerSide::First);
        round_log.extend(log);
        if state.check_end() {
            return round_log;
        }
        state.advance_phase(); // → SecondPlayerTurn
    }

    // 后手回合
    if state.phase == DuelPhase::SecondPlayerTurn {
        let log = execute_player_turn(state, PlayerSide::Second);
        round_log.extend(log);
        if state.check_end() {
            return round_log;
        }
        state.advance_phase(); // → Settlement
    }

    // 结算阶段
    if state.phase == DuelPhase::Settlement {
        let log = execute_settlement(state);
        round_log.extend(log);
        if state.check_end() {
            return round_log;
        }
        state.advance_phase(); // → End or next round
    }

    // 如果未结束，重新开始下一轮
    if state.phase == DuelPhase::End {
        // 已结束
    } else {
        // 下一轮准备
        state.round += 1;
        state.phase = DuelPhase::FirstPlayerTurn;
        state.on_phase_enter(DuelPhase::FirstPlayerTurn);
    }

    round_log
}

/// 执行单个玩家的回合
fn execute_player_turn(state: &mut DuelState, side: PlayerSide) -> Vec<EffectLogEntry> {
    let mut log: Vec<EffectLogEntry> = vec![];
    state.active_player = side;

    // 回合开始阶段
    {
        let active_name = state.field(side).name.clone();
        let desc = format!("{} 的回合开始 (第{}回合)", active_name, state.round);
        state.log_effect(&active_name, &desc, side);
        log.push(EffectLogEntry {
            round: state.round,
            phase: state.phase.name().to_string(),
            source: active_name,
            description: desc,
            owner: side.name().to_string(),
        });
    }

    // 攻击阶段
    let attack_result = execute_attack(state, side);
    log.extend(attack_result);

    // 检查对手是否死亡
    if state.check_end() {
        return log;
    }

    // 结算效果栈
    resolve_effect_stack(state);

    // 回合结束阶段
    {
        let active_name = state.field(side).name.clone();
        let desc = format!("{} 的回合结束", active_name);
        state.log_effect(&active_name, &desc, side);
        log.push(EffectLogEntry {
            round: state.round,
            phase: state.phase.name().to_string(),
            source: active_name,
            description: desc,
            owner: side.name().to_string(),
        });
    }

    log
}

/// 执行攻击
fn execute_attack(state: &mut DuelState, attacker_side: PlayerSide) -> Vec<EffectLogEntry> {
    let mut log: Vec<EffectLogEntry> = vec![];
    let defender_side = attacker_side.opponent();

    let attacker = state.field(attacker_side);
    let atk_name = attacker.name.clone();
    let atk_physical = attacker.physical_attack;
    let atk_magic = attacker.magic_attack;
    let has_attacked = attacker.has_attacked;
    let attack_count = attacker.attack_count;

    if has_attacked {
        return log;
    }

    // 基础物理攻击
    if attack_count > 0 {
        let total_dmg = atk_physical + atk_magic;
        if total_dmg > 0 {
            let dmg_type = if atk_magic > 0 { DamageType::Magical } else { DamageType::Physical };
            let defender_before = state.field(defender_side).hp;

            let actual = state.field_mut(defender_side).take_damage(total_dmg, dmg_type);

            let desc = format!(
                "{} 对 {} 造成了 {} 点{}伤害 (护甲吸收后实际: {}), {} 生命 {}→{}",
                atk_name,
                state.field(defender_side).name,
                total_dmg,
                if dmg_type == DamageType::Physical { "物理" } else { "法术" },
                actual,
                state.field(defender_side).name,
                defender_before,
                state.field(defender_side).hp,
            );
            state.field_mut(attacker_side).has_attacked = true;
            state.field_mut(attacker_side).damage_dealt_this_turn += actual;
            state.log_effect(&atk_name, &desc, attacker_side);
            log.push(EffectLogEntry {
                round: state.round,
                phase: state.phase.name().to_string(),
                source: atk_name.clone(),
                description: desc,
                owner: attacker_side.name().to_string(),
            });
        }
    }

    log
}

/// 结算效果栈（LIFO）
fn resolve_effect_stack(state: &mut DuelState) {
    while let Some(entry) = state.pop_effect() {
        let desc = format!("结算效果: [{}] {} → {}", entry.source, entry.description, entry.target.name());
        state.log_effect(&entry.source, &desc, entry.owner);
    }
}

/// 执行结算阶段
fn execute_settlement(state: &mut DuelState) -> Vec<EffectLogEntry> {
    let mut log: Vec<EffectLogEntry> = vec![];

    let desc = format!("=== 第{}回合结算阶段 ===", state.round);
    log.push(EffectLogEntry {
        round: state.round,
        phase: state.phase.name().to_string(),
        source: "系统".to_string(),
        description: desc,
        owner: "系统".to_string(),
    });

    // 结算回合结束效果（如儒家仁心≥1自动抽牌）
    // 这里简化处理：标记过期逻辑
    for side in &[PlayerSide::First, PlayerSide::Second] {
        let field = state.field(*side);
        let marks: Vec<(String, i32)> = field.marks.iter().map(|(k, v)| (k.clone(), *v)).collect();
        for (mark_name, count) in marks {
            if count > 0 {
                let desc = format!("{} 持有 [{}] ×{}", field.name, mark_name, count);
                log.push(EffectLogEntry {
                    round: state.round,
                    phase: state.phase.name().to_string(),
                    source: field.name.clone(),
                    description: desc,
                    owner: side.name().to_string(),
                });
            }
        }
    }

    // 检查胜负
    let first_alive = state.field(PlayerSide::First).is_alive();
    let second_alive = state.field(PlayerSide::Second).is_alive();

    if !first_alive || !second_alive {
        state.phase = DuelPhase::End;
        state.result = Some(match (first_alive, second_alive) {
            (true, false) => DuelResult::FirstPlayerWin,
            (false, true) => DuelResult::SecondPlayerWin,
            _ => DuelResult::Draw,
        });
        let result_desc = state.result.as_ref().unwrap().description();
        log.push(EffectLogEntry {
            round: state.round,
            phase: "结束".to_string(),
            source: "系统".to_string(),
            description: format!("对峙结束: {}", result_desc),
            owner: "系统".to_string(),
        });
    }

    log
}

// ============ 效果执行函数 ============

/// 对指定目标执行单个效果
pub fn apply_effect(
    state: &mut DuelState,
    effect: &Effect,
    owner: PlayerSide,
) -> Option<String> {
    let target_side = resolve_target(&effect.target, owner);
    let target_field = state.field_mut(target_side);
    let source_name = &effect.source_card;

    let result_desc = match &effect.effect_type {
        EffectType::DealDamage { amount, damage_type } => {
            let before = target_field.hp;
            let actual = target_field.take_damage(*amount, *damage_type);
            Some(format!(
                "{} 对 {} 造成 {} 点{}伤害, 生命 {}→{}",
                source_name, target_field.name, actual,
                match damage_type {
                    DamageType::Physical => "物理",
                    DamageType::Magical => "法术",
                    DamageType::True => "真实",
                },
                before, target_field.hp,
            ))
        }
        EffectType::Heal { amount } => {
            let before = target_field.hp;
            let actual = target_field.heal(*amount);
            Some(format!(
                "{} 恢复了 {} 点生命, {}→{}",
                target_field.name, actual, before, target_field.hp,
            ))
        }
        EffectType::GainArmor { amount } => {
            target_field.gain_armor(*amount);
            Some(format!("{} 获得了 {} 点护甲", target_field.name, amount))
        }
        EffectType::RestoreEnergy { amount } => {
            let before = target_field.energy;
            target_field.modify_energy(*amount);
            Some(format!(
                "{} 恢复了 {} 点技力, {}→{}",
                target_field.name, amount, before, target_field.energy,
            ))
        }
        EffectType::GainMark { mark_name, count, max } => {
            if let Some(max_val) = max {
                let current = target_field.mark_count(mark_name);
                if current >= *max_val {
                    return Some(format!("{} 标记已达上限({}), 无法继续积累", mark_name, max_val));
                }
                let to_add = (*count).min(*max_val - current);
                target_field.add_mark(mark_name, to_add);
                return Some(format!("{} 获得了 {} 层[{}]标记 (上限{})", target_field.name, to_add, mark_name, max_val));
            }
            target_field.add_mark(mark_name, *count);
            Some(format!("{} 获得了 {} 层[{}]标记", target_field.name, count, mark_name))
        }
        EffectType::ConsumeMark { mark_name, count } => {
            let ok = target_field.consume_marks(mark_name, *count);
            Some(if ok {
                format!("{} 消耗了 {} 层[{}]标记", target_field.name, count, mark_name)
            } else {
                format!("{} 没有足够的[{}]标记({}需要{})", target_field.name, mark_name, target_field.mark_count(mark_name), count)
            })
        }
        EffectType::Deduct { resource, amount } => {
            match resource.as_str() {
                "技力" => {
                    target_field.modify_energy(-(*amount));
                    Some(format!("{} 失去了 {} 点技力", target_field.name, amount))
                }
                "生命" => {
                    target_field.take_damage(*amount, DamageType::True);
                    Some(format!("{} 失去了 {} 点生命", target_field.name, amount))
                }
                _ => Some(format!("{} 被扣除了 {} 点{}", target_field.name, amount, resource)),
            }
        }
        EffectType::IncreaseStat { stat, amount, permanent } => {
            let perm_str = if *permanent { "永久" } else { "" };
            match stat.as_str() {
                "物理伤害" | "伤害" => {
                    target_field.physical_attack += amount;
                }
                "法术伤害" => {
                    target_field.magic_attack += amount;
                }
                "技力上限" => {
                    target_field.max_energy += amount;
                }
                _ => {}
            }
            Some(format!("{} {}增加了 {} 点{}{}", target_field.name, perm_str, amount, stat, if *permanent { "" } else { " (本回合)" }))
        }
        EffectType::DecreaseStat { stat, amount, permanent: _ } => {
            match stat.as_str() {
                "技力上限" => {
                    target_field.max_energy = (target_field.max_energy - amount).max(0);
                }
                "技力" => {
                    target_field.modify_energy(-(*amount));
                }
                _ => {}
            }
            Some(format!("{} 的{}降低了 {} 点", target_field.name, stat, amount))
        }
        EffectType::CounterDamage { amount } => {
            let before = target_field.hp;
            let actual = state.field_mut(target_side.opponent()).take_damage(*amount, DamageType::Physical);
            Some(format!(
                "反制: 对攻击者造成 {} 点伤害, 生命 {}→{}",
                actual, before, state.field(target_side.opponent()).hp,
            ))
        }
        EffectType::ForceEffect { description } => {
            Some(format!("{} 触发了效果: {}", source_name, description))
        }
        EffectType::ExecuteTag { tag_name } => {
            Some(format!("{} 执行了标签 [{}]", source_name, tag_name))
        }
        EffectType::Eliminate => {
            target_field.hp = 0;
            Some(format!("{} 被直接淘汰!", target_field.name))
        }
        EffectType::SetNearDeath => {
            target_field.hp = 1;
            Some(format!("{} 进入濒死状态 (生命=1)", target_field.name))
        }
        _ => {
            Some(format!("{} 触发效果: {:?}", source_name, effect.effect_type))
        }
    };

    if let Some(ref desc) = result_desc {
        state.log_effect(source_name, desc, owner);
    }

    result_desc
}

/// 解析目标选择器
fn resolve_target(target: &TargetSelector, owner: PlayerSide) -> PlayerSide {
    match target {
        TargetSelector::Self_ => owner,
        TargetSelector::Target | TargetSelector::Attacker | TargetSelector::DamageSource => {
            owner.opponent()
        }
        TargetSelector::Player(side) => *side,
        _ => owner.opponent(),
    }
}

// ============ 条件判断器 ============

/// 判断效果是否满足触发条件
pub fn check_condition(state: &DuelState, condition: &TriggerCondition, owner: PlayerSide) -> bool {
    let field = state.field(owner);
    let opponent = state.field(owner.opponent());

    match condition {
        TriggerCondition::None => true,
        TriggerCondition::Cost { resource, amount, extra: _ } => {
            match resource.as_str() {
                "技力" => field.energy >= *amount,
                "生命" => field.hp > *amount,
                "手牌" => (field.hand_cards.len() as i32) >= *amount,
                "标记" => true, // 简化：标记消耗由具体 mark 检查
                _ => true,
            }
        }
        TriggerCondition::OnEvent { event: _, params: _ } => {
            // 事件触发条件假设满足（由上层按序驱动）
            true
        }
        TriggerCondition::Threshold { stat, operator, value } => {
            let current = match stat.as_str() {
                "技力" => field.energy,
                "生命" => field.hp,
                "护甲" => field.armor,
                s if s.starts_with("「") && s.ends_with("」") => {
                    field.mark_count(&s[3..s.len()-3])
                }
                s => field.mark_count(s),
            };
            match operator.as_str() {
                "≥" => current >= *value,
                "＜" => current < *value,
                "=" => current == *value,
                ">" => current > *value,
                _ => current >= *value,
            }
        }
        TriggerCondition::StateCheck { target, condition } => {
            let check_field = match target.as_str() {
                "目标" => opponent,
                "自身" => field,
                _ => opponent,
            };
            if condition.contains("有护甲") {
                check_field.armor > 0
            } else if condition.contains("有技力") {
                check_field.energy > 0
            } else if condition.contains("手牌为0") {
                check_field.hand_cards.is_empty()
            } else if condition.contains("手牌≤") {
                let num = condition.chars().filter(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(3);
                (check_field.hand_cards.len() as i32) <= num
            } else if condition.contains("生命＜") {
                let num = condition.chars().filter(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(2);
                check_field.hp < num
            } else {
                true
            }
        }
        TriggerCondition::Cumulative { tracked, operator: _, value: _ } => {
            match tracked.as_str() {
                "受伤" => {
                    // 简化：检查对手本回合造成的伤害
                    opponent.damage_dealt_this_turn >= 1
                }
                "治疗" => field.healed_this_turn >= 1,
                _ => true,
            }
        }
        TriggerCondition::Declare { what: _, value: _ } => true,
        TriggerCondition::JudgeResult { condition: _, expected: _ } => true,
        TriggerCondition::Ordinal { nth: _, scope: _ } => true,
    }
}

// ============ 测试 ============

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::state::PlayerField;

    fn make_test_state() -> DuelState {
        DuelState::new(
            PlayerField::new("玩家A", "儒家"),
            PlayerField::new("玩家B", "法家"),
            "test".into(),
        )
    }

    #[test]
    fn test_execute_full_round() {
        let mut state = make_test_state();
        // 设置先手方属性
        state.field_mut(PlayerSide::First).physical_attack = 1;
        state.field_mut(PlayerSide::First).hp = 8;
        state.field_mut(PlayerSide::Second).hp = 6;
        state.field_mut(PlayerSide::Second).armor = 0;

        let log = execute_full_round(&mut state);

        // 应该有先手方攻击记录 + 后手方攻击 + 结算
        assert!(!log.is_empty());

        // 检查后手方受伤
        let second_hp = state.field(PlayerSide::Second).hp;
        assert!(second_hp < 6, "后手方应受到伤害, 实际 hp={}", second_hp);
    }

    #[test]
    fn test_apply_effect_damage() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::Second).armor = 0;
        state.field_mut(PlayerSide::Second).hp = 6;

        let effect = Effect {
            effect_type: EffectType::DealDamage { amount: 2, damage_type: DamageType::Physical },
            trigger: TriggerCondition::None,
            target: TargetSelector::Target,
            value: 2,
            source_card: "击敌".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "造成".into(),
            object_text: "2点物理伤害".into(),
            note: "—".into(),
            limit: None,
        };

        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert_eq!(state.field(PlayerSide::Second).hp, 4);
    }

    #[test]
    fn test_apply_effect_heal() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::First).hp = 5;

        let effect = Effect {
            effect_type: EffectType::Heal { amount: 2 },
            trigger: TriggerCondition::None,
            target: TargetSelector::Self_,
            value: 2,
            source_card: "疗伤".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "恢复".into(),
            object_text: "2点生命".into(),
            note: "—".into(),
            limit: None,
        };

        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert_eq!(state.field(PlayerSide::First).hp, 7);
    }

    #[test]
    fn test_check_condition_threshold() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::First).energy = 3;

        let cond = TriggerCondition::Threshold {
            stat: "技力".into(),
            operator: "≥".into(),
            value: 2,
        };
        assert!(check_condition(&state, &cond, PlayerSide::First));
    }

    #[test]
    fn test_check_condition_state() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::Second).armor = 3;

        let cond = TriggerCondition::StateCheck {
            target: "目标".into(),
            condition: "有护甲".into(),
        };
        assert!(check_condition(&state, &cond, PlayerSide::First));
    }

    // ============ 更多效果类型测试 ============

    #[test]
    fn test_apply_effect_gain_armor() {
        let mut state = make_test_state();
        let effect = Effect {
            effect_type: EffectType::GainArmor { amount: 3 },
            trigger: TriggerCondition::None,
            target: TargetSelector::Self_,
            value: 3,
            source_card: "护甲卡".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "获得".into(),
            object_text: "3点护甲".into(),
            note: "—".into(),
            limit: None,
        };
        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert_eq!(state.field(PlayerSide::First).armor, 5); // 初始 2 + 3
    }

    #[test]
    fn test_apply_effect_restore_energy() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::First).energy = 1;
        let effect = Effect {
            effect_type: EffectType::RestoreEnergy { amount: 2 },
            trigger: TriggerCondition::None,
            target: TargetSelector::Self_,
            value: 2,
            source_card: "回能".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "恢复".into(),
            object_text: "2点技力".into(),
            note: "—".into(),
            limit: None,
        };
        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert_eq!(state.field(PlayerSide::First).energy, 3);
    }

    #[test]
    fn test_apply_effect_gain_mark() {
        let mut state = make_test_state();
        let effect = Effect {
            effect_type: EffectType::GainMark {
                mark_name: "仁心".into(),
                count: 2,
                max: None,
            },
            trigger: TriggerCondition::None,
            target: TargetSelector::Self_,
            value: 2,
            source_card: "儒学".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "积累".into(),
            object_text: "2个「仁心」标记".into(),
            note: "—".into(),
            limit: None,
        };
        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert_eq!(state.field(PlayerSide::First).mark_count("仁心"), 2);
    }

    #[test]
    fn test_apply_effect_gain_mark_max() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::First).add_mark("仁心", 3);
        let effect = Effect {
            effect_type: EffectType::GainMark {
                mark_name: "仁心".into(),
                count: 2,
                max: Some(4),
            },
            trigger: TriggerCondition::None,
            target: TargetSelector::Self_,
            value: 2,
            source_card: "儒学".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "积累".into(),
            object_text: "2个「仁心」标记".into(),
            note: "—".into(),
            limit: None,
        };
        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert_eq!(state.field(PlayerSide::First).mark_count("仁心"), 4);
    }

    #[test]
    fn test_apply_effect_consume_mark_success() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::First).add_mark("法令", 3);
        let effect = Effect {
            effect_type: EffectType::ConsumeMark {
                mark_name: "法令".into(),
                count: 2,
            },
            trigger: TriggerCondition::None,
            target: TargetSelector::Self_,
            value: 2,
            source_card: "消耗标记".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "消耗".into(),
            object_text: "2个「法令」标记".into(),
            note: "—".into(),
            limit: None,
        };
        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert_eq!(state.field(PlayerSide::First).mark_count("法令"), 1);
    }

    #[test]
    fn test_apply_effect_consume_mark_fail() {
        let mut state = make_test_state();
        let effect = Effect {
            effect_type: EffectType::ConsumeMark {
                mark_name: "仁心".into(),
                count: 2,
            },
            trigger: TriggerCondition::None,
            target: TargetSelector::Self_,
            value: 2,
            source_card: "消耗".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "消耗".into(),
            object_text: "2个「仁心」标记".into(),
            note: "—".into(),
            limit: None,
        };
        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert!(result.unwrap().contains("没有足够的"));
    }

    #[test]
    fn test_apply_effect_deduct_energy() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::Second).energy = 3;
        let effect = Effect {
            effect_type: EffectType::Deduct {
                resource: "技力".into(),
                amount: 2,
            },
            trigger: TriggerCondition::None,
            target: TargetSelector::Target,
            value: 2,
            source_card: "扣技".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "扣除".into(),
            object_text: "2点技力".into(),
            note: "—".into(),
            limit: None,
        };
        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert_eq!(state.field(PlayerSide::Second).energy, 1);
    }

    #[test]
    fn test_apply_effect_eliminate() {
        let mut state = make_test_state();
        let effect = Effect {
            effect_type: EffectType::Eliminate,
            trigger: TriggerCondition::None,
            target: TargetSelector::Target,
            value: 0,
            source_card: "灭杀".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "淘汰".into(),
            object_text: "目标".into(),
            note: "—".into(),
            limit: None,
        };
        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert!(!state.field(PlayerSide::Second).is_alive());
    }

    #[test]
    fn test_apply_effect_set_near_death() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::Second).hp = 8;
        let effect = Effect {
            effect_type: EffectType::SetNearDeath,
            trigger: TriggerCondition::None,
            target: TargetSelector::Target,
            value: 0,
            source_card: "濒死".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "使目标进入".into(),
            object_text: "濒死".into(),
            note: "—".into(),
            limit: None,
        };
        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert_eq!(state.field(PlayerSide::Second).hp, 1);
    }

    #[test]
    fn test_apply_effect_execute_tag() {
        let mut state = make_test_state();
        let effect = Effect {
            effect_type: EffectType::ExecuteTag {
                tag_name: "一槌定音".into(),
            },
            trigger: TriggerCondition::None,
            target: TargetSelector::Self_,
            value: 0,
            source_card: "指虎".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "执行".into(),
            object_text: "[一槌定音]".into(),
            note: "—".into(),
            limit: None,
        };
        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert!(result.unwrap().contains("一槌定音"));
    }

    #[test]
    fn test_apply_effect_increase_stat_physical() {
        let mut state = make_test_state();
        let pa_before = state.field(PlayerSide::First).physical_attack;
        let effect = Effect {
            effect_type: EffectType::IncreaseStat {
                stat: "物理伤害".into(),
                amount: 2,
                permanent: false,
            },
            trigger: TriggerCondition::None,
            target: TargetSelector::Self_,
            value: 2,
            source_card: "强化".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "增加".into(),
            object_text: "2点物理伤害".into(),
            note: "—".into(),
            limit: None,
        };
        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert_eq!(state.field(PlayerSide::First).physical_attack, pa_before + 2);
    }

    #[test]
    fn test_apply_effect_decrease_stat() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::Second).energy = 4;
        state.field_mut(PlayerSide::Second).max_energy = 4;
        let effect = Effect {
            effect_type: EffectType::DecreaseStat {
                stat: "技力上限".into(),
                amount: 1,
                permanent: false,
            },
            trigger: TriggerCondition::None,
            target: TargetSelector::Target,
            value: 1,
            source_card: "削弱".into(),
            condition_text: "—".into(),
            subject_text: "自身".into(),
            predicate_text: "降低".into(),
            object_text: "1点技力上限".into(),
            note: "—".into(),
            limit: None,
        };
        let result = apply_effect(&mut state, &effect, PlayerSide::First);
        assert!(result.is_some());
        assert_eq!(state.field(PlayerSide::Second).max_energy, 3);
    }

    // ============ 更多条件判断 ============

    #[test]
    fn test_check_condition_cost_energy() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::First).energy = 5;
        let cond = TriggerCondition::Cost {
            resource: "技力".into(),
            amount: 3,
            extra: None,
        };
        assert!(check_condition(&state, &cond, PlayerSide::First));

        state.field_mut(PlayerSide::First).energy = 2;
        assert!(!check_condition(&state, &cond, PlayerSide::First));
    }

    #[test]
    fn test_check_condition_cost_hand() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::First).hand_cards = vec!["牌1".into(), "牌2".into()];
        let cond = TriggerCondition::Cost {
            resource: "手牌".into(),
            amount: 2,
            extra: None,
        };
        assert!(check_condition(&state, &cond, PlayerSide::First));

        state.field_mut(PlayerSide::First).hand_cards = vec![];
        assert!(!check_condition(&state, &cond, PlayerSide::First));
    }

    #[test]
    fn test_check_condition_none() {
        let state = make_test_state();
        assert!(check_condition(&state, &TriggerCondition::None, PlayerSide::First));
    }

    #[test]
    fn test_check_condition_threshold_smaller() {
        let mut state = make_test_state();
        state.field_mut(PlayerSide::First).hp = 3;
        let cond = TriggerCondition::Threshold {
            stat: "生命".into(),
            operator: "＜".into(),
            value: 5,
        };
        assert!(check_condition(&state, &cond, PlayerSide::First));
    }

    #[test]
    fn test_resolve_target_self() {
        assert_eq!(resolve_target(&TargetSelector::Self_, PlayerSide::First), PlayerSide::First);
        assert_eq!(resolve_target(&TargetSelector::Self_, PlayerSide::Second), PlayerSide::Second);
    }

    #[test]
    fn test_resolve_target_target() {
        assert_eq!(resolve_target(&TargetSelector::Target, PlayerSide::First), PlayerSide::Second);
        assert_eq!(resolve_target(&TargetSelector::Target, PlayerSide::Second), PlayerSide::First);
    }
}
