//! 效果结算引擎 — 支付 → 结算 → 连锁 三段式执行
//!
//! 来自 grammar/01-source-format.md 第三章"支付与结算原则"。
//!
//! 核心原则：先支付，后生效。
//!
//! ① 支付阶段（Pay）：
//!    - 消耗技力/生命/手牌/标记（不可被免疫）
//!    - 支付一旦完成，资源不可退回
//! ② 效果结算阶段（Settle）：
//!    - 效果执行，可被免疫/无效化
//!    - 免疫只取消此阶段结果，不退回支付
//! ③ 后续连锁阶段（Chain）：
//!    - 同一支付下的后续效果按书写顺序结算
//!    - "随后"关键字触发连锁

use dz_cardmaker_ports::*;

// ============================================================================
// 结算指令
// ============================================================================

#[derive(Debug, Clone)]
pub enum EffectAction {
    /// 消耗（支付阶段）— 从自身扣除资源。不可免疫。
    PayCost {
        energy: u32,
        hp: u32,
        hand_cards: u32,
        marks: Vec<MarkId>,
    },

    /// 对目标造成伤害 — 效果结算，可被免疫
    DealDamage {
        amount: u32,
        damage_type: DamageType,
    },

    /// 恢复生命（效果阶段）
    RestoreHp { amount: u32 },

    /// 恢复技力（效果阶段）
    RestoreEnergy { amount: u32 },

    /// 获得护甲（效果阶段）
    GainArmor { amount: u32 },

    /// 移除护甲（效果阶段）— 非伤害，不可免疫
    RemoveArmor { amount: u32 },

    /// 扣除技力（对目标，效果阶段）— 非伤害，不可免疫
    DeductEnergy { amount: u32 },

    /// 移除标记（效果阶段）— 非伤害，不可免疫
    RemoveMark { mark_id: MarkId, count: u32 },

    /// 获得标记（效果阶段）
    GainMark { mark_id: MarkId, count: u32 },

    /// 抽取牌（效果阶段）
    DrawCards { count: u32 },

    /// 弃置手牌（效果阶段）
    DiscardCards { count: u32 },

    /// 免疫本次伤害（效果响应）
    ImmuneDamage,

    /// 连锁：随后执行
    Chain { action: Box<EffectAction> },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DamageType {
    Physical,
    Spell,
    TrueDamage,
}

// ============================================================================
// 结算结果
// ============================================================================

#[derive(Debug)]
pub struct SettlementResult {
    pub paid_energy: u32,
    pub paid_hp: u32,
    pub paid_cards: u32,
    pub damage_dealt: u32,
    pub damage_negated: u32,
    pub hp_restored: u32,
    pub energy_restored: u32,
    pub cards_drawn: u32,
    pub cards_discarded: u32,
    pub chain_actions: Vec<EffectAction>,
    pub log_entries: Vec<LogEntry>,
}

impl SettlementResult {
    pub fn new() -> Self {
        Self {
            paid_energy: 0,
            paid_hp: 0,
            paid_cards: 0,
            damage_dealt: 0,
            damage_negated: 0,
            hp_restored: 0,
            energy_restored: 0,
            cards_drawn: 0,
            cards_discarded: 0,
            chain_actions: Vec::new(),
            log_entries: Vec::new(),
        }
    }
}

// ============================================================================
// 结算引擎
// ============================================================================

pub struct EffectEngine;
pub use EffectEngine as Engine;

impl EffectEngine {
    /// 执行一组效果动作，按 ①支付 → ②结算 → ③连锁 顺序。
    pub fn execute(
        actions: &[EffectAction],
        source: &mut RuntimeCardInstance,
        target: &mut RuntimeCardInstance,
        turn: u32,
    ) -> SettlementResult {
        let mut result = SettlementResult::new();

        // ─── ① 支付阶段 ───
        for action in actions {
            if let EffectAction::PayCost { energy, hp, hand_cards, .. } = action {
                // 支付不可被免疫
                result.paid_energy += *energy;
                result.paid_hp += *hp;
                result.paid_cards += *hand_cards;

                source.energy = source.energy.saturating_sub(*energy);
                source.hp     = source.hp.saturating_sub(*hp);

                if *energy > 0 {
                    result.log_entries.push(LogEntry {
                        turn,
                        action: "支付".into(),
                        actor: Some(source.runtime_id.0.clone()),
                        target: None,
                        result: format!("消耗 {} 点技力", energy),
                    });
                }
                if *hp > 0 {
                    result.log_entries.push(LogEntry {
                        turn,
                        action: "支付".into(),
                        actor: Some(source.runtime_id.0.clone()),
                        target: None,
                        result: format!("消耗 {} 点生命", hp),
                    });
                }
            }
        }

        // ─── ② 效果结算阶段 ───
        let mut immune_to_damage = false;
        for action in actions {
            match action {
                EffectAction::PayCost { .. } => {
                    // 已在支付阶段处理
                }

                EffectAction::ImmuneDamage => {
                    immune_to_damage = true;
                    result.damage_negated = 1;
                }

                EffectAction::DealDamage { amount, damage_type } => {
                    if immune_to_damage {
                        result.damage_negated += amount;
                        result.log_entries.push(LogEntry {
                            turn,
                            action: "伤害免疫".into(),
                            actor: Some(source.runtime_id.0.clone()),
                            target: Some(target.runtime_id.0.clone()),
                            result: format!("{} 点伤害被免疫", amount),
                        });
                        immune_to_damage = false;
                    } else {
                        let effective = Self::apply_damage(target, *amount, damage_type);
                        result.damage_dealt += effective.dealt;
                        result.damage_negated += effective.negated;
                        result.log_entries.push(LogEntry {
                            turn,
                            action: "伤害".into(),
                            actor: Some(source.runtime_id.0.clone()),
                            target: Some(target.runtime_id.0.clone()),
                            result: format!("{} 点伤害 ({}), {} 被免疫",
                                effective.dealt, damage_type_name(damage_type), effective.negated),
                        });
                    }
                }

                EffectAction::RestoreHp { amount } => {
                    target.hp = target.hp.saturating_add(*amount);
                    result.hp_restored += amount;
                    result.log_entries.push(LogEntry {
                        turn,
                        action: "恢复".into(),
                        actor: Some(source.runtime_id.0.clone()),
                        target: Some(target.runtime_id.0.clone()),
                        result: format!("恢复 {} 点生命", amount),
                    });
                }

                EffectAction::RestoreEnergy { amount } => {
                    target.energy = target.energy.saturating_add(*amount);
                    result.energy_restored += amount;
                    result.log_entries.push(LogEntry {
                        turn,
                        action: "恢复".into(),
                        actor: Some(source.runtime_id.0.clone()),
                        target: Some(target.runtime_id.0.clone()),
                        result: format!("恢复 {} 点技力", amount),
                    });
                }

                EffectAction::GainArmor { amount } => {
                    target.armor = target.armor.saturating_add(*amount);
                    result.log_entries.push(LogEntry {
                        turn,
                        action: "获得护甲".into(),
                        actor: Some(target.runtime_id.0.clone()),
                        target: None,
                        result: format!("获得 {} 点护甲", amount),
                    });
                }

                EffectAction::RemoveArmor { amount } => {
                    // 移除护甲不可免疫（非伤害）
                    target.armor = target.armor.saturating_sub(*amount);
                    result.log_entries.push(LogEntry {
                        turn,
                        action: "移除护甲".into(),
                        actor: Some(source.runtime_id.0.clone()),
                        target: Some(target.runtime_id.0.clone()),
                        result: format!("移除 {} 点护甲", amount),
                    });
                }

                EffectAction::DeductEnergy { amount } => {
                    // 扣除技力不可免疫（非伤害）
                    target.energy = target.energy.saturating_sub(*amount);
                    result.log_entries.push(LogEntry {
                        turn,
                        action: "扣除技力".into(),
                        actor: Some(source.runtime_id.0.clone()),
                        target: Some(target.runtime_id.0.clone()),
                        result: format!("扣除 {} 点技力", amount),
                    });
                }

                EffectAction::RemoveMark { mark_id, count } => {
                    let entry = target.marks.entry(mark_id.clone()).or_insert(0);
                    let removed = (*entry).min(*count as u32);
                    *entry = entry.saturating_sub(removed);
                    result.log_entries.push(LogEntry {
                        turn,
                        action: "移除标记".into(),
                        actor: Some(source.runtime_id.0.clone()),
                        target: Some(target.runtime_id.0.clone()),
                        result: format!("移除 {} 个「{}」", removed, mark_id.0),
                    });
                }

                EffectAction::GainMark { mark_id, count } => {
                    *target.marks.entry(mark_id.clone()).or_insert(0) += *count as u32;
                    result.log_entries.push(LogEntry {
                        turn,
                        action: "获得标记".into(),
                        actor: Some(target.runtime_id.0.clone()),
                        target: None,
                        result: format!("获得 {} 个「{}」", count, mark_id.0),
                    });
                }

                EffectAction::DrawCards { count } => {
                    result.cards_drawn += count;
                    result.log_entries.push(LogEntry {
                        turn,
                        action: "抽牌".into(),
                        actor: Some(source.runtime_id.0.clone()),
                        target: None,
                        result: format!("抽取 {} 张牌", count),
                    });
                }

                EffectAction::DiscardCards { count } => {
                    result.cards_discarded += count;
                    result.log_entries.push(LogEntry {
                        turn,
                        action: "弃牌".into(),
                        actor: Some(source.runtime_id.0.clone()),
                        target: None,
                        result: format!("弃置 {} 张牌", count),
                    });
                }

                EffectAction::Chain { action: _chain } => {
                    // Chain actions are collected for stack processing
                }
            }
        }

        // ─── ③ 连锁阶段 — 收集后续动作 ───
        for action in actions {
            if let EffectAction::Chain { .. } = action {
                result.chain_actions.push(action.clone());
            }
        }

        result
    }

    /// 对目标造成伤害，先扣护甲再扣生命。返回(实际伤害, 被免疫量)。
    fn apply_damage(_target: &mut RuntimeCardInstance, amount: u32, _dmg_type: &DamageType) -> DamageApplied {
        let mut remaining = amount;

        // 先扣护甲（真实伤害除外）
        if *_dmg_type != DamageType::TrueDamage {
            let absorbed = _target.armor.min(remaining);
            _target.armor -= absorbed;
            remaining -= absorbed;
        }

        // 扣生命
        let hp_loss = _target.hp.min(remaining);
        _target.hp -= hp_loss;
        remaining -= hp_loss;

        DamageApplied {
            dealt: amount - remaining,
            negated: remaining,
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct DamageApplied {
    dealt: u32,
    negated: u32,
}

fn damage_type_name(dt: &DamageType) -> &str {
    match dt {
        DamageType::Physical => "物理",
        DamageType::Spell => "法术",
        DamageType::TrueDamage => "真实",
    }
}

// ============================================================================
// 效果文本 → 结算指令 解析
// ============================================================================

/// 从 DZ 效果行的 AST 条目中解析出结算指令。
/// 返回 Vec<EffectAction>，第一个动作通常是支付。
pub fn parse_effect_to_actions(entry: &serde_json::Value) -> Vec<EffectAction> {
    let mut actions = Vec::new();
    let text = entry["text"].as_str().unwrap_or("");

    // 提取支付（消耗 XXX）
    if text.contains("消耗") {
        let energy = extract_number_before_keyword(text, "消耗", "技力");
        let hp     = extract_number_before_keyword(text, "消耗", "生命");
        let cards  = if text.contains("弃") && text.contains("张") {
            extract_number_before_keyword(text, "弃", "张")
        } else { 0 };

        if energy > 0 || hp > 0 || cards > 0 {
            actions.push(EffectAction::PayCost {
                energy,
                hp,
                hand_cards: cards,
                marks: Vec::new(),
            });
        }

        // 消耗标记 「XXX」
        if text.contains("「") && text.contains("个") {
            let mark_refs: Vec<String> = entry["mark_refs"]
                .as_array().map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            for mark_name in &mark_refs {
                let count = extract_number_before_keyword(text, "个", mark_name);
                if count > 0 {
                    if let Some(pay) = actions.last_mut() {
                        if let EffectAction::PayCost { ref mut marks, .. } = pay {
                            marks.push(MarkId(mark_name.clone()));
                        }
                    }
                }
            }
        }
    }

    // 提取伤害
    if text.contains("造成") && text.contains("伤害") {
        let amount = extract_number_before_keyword(text, "造成", "点");
        let amount = if amount > 0 { amount } else { 1 };
        let dmg_type = if text.contains("物理") { DamageType::Physical }
            else if text.contains("法术") { DamageType::Spell }
            else if text.contains("真实") { DamageType::TrueDamage }
            else { DamageType::Physical };
        actions.push(EffectAction::DealDamage { amount, damage_type: dmg_type });
    }

    // 提取恢复
    if text.contains("恢复") && text.contains("技力") {
        let amount = extract_number_before_keyword(text, "恢复", "点");
        actions.push(EffectAction::RestoreEnergy { amount: amount.max(1) });
    }
    if text.contains("恢复") && text.contains("生命") {
        let amount = extract_number_before_keyword(text, "恢复", "点");
        actions.push(EffectAction::RestoreHp { amount: amount.max(1) });
    }

    // 提取获得护甲
    if text.contains("获得") && text.contains("护甲") {
        let amount = extract_number_before_keyword(text, "获得", "点");
        actions.push(EffectAction::GainArmor { amount: amount.max(1) });
    }

    // 提取抽牌
    if text.contains("抽取") && text.contains("张") {
        let amount = extract_number_before_keyword(text, "抽取", "张");
        actions.push(EffectAction::DrawCards { count: amount.max(1) });
    }

    // 连锁（随后）
    if text.contains("随后") {
        actions.push(EffectAction::Chain {
            action: Box::new(EffectAction::DrawCards { count: 0 }) // placeholder
        });
    }

    actions
}

fn extract_number_before_keyword(text: &str, before: &str, keyword: &str) -> u32 {
    if let Some(pos) = text.find(before) {
        let after_pos = pos + before.len();
        let segment = &text[after_pos..];
        if let Some(kw_pos) = segment.find(keyword) {
            let num_segment = segment[..kw_pos].trim();
            // Extract digits-only prefix (handle Chinese numbers in future)
            let digits: String = num_segment.chars().take_while(|c| c.is_ascii_digit()).collect();
            return digits.parse().unwrap_or(1);
        }
    }
    0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_damage_through_armor() {
        let mut source = RuntimeCardInstance {
            runtime_id: RuntimeCardId("src".into()),
            static_def_ref: StaticCardId("GZ01".into()),
            zone: Zone::Field,
            owner: PlayerId("P1".into()),
            hp: 10, armor: 0, energy: 5,
            marks: Default::default(),
        };
        let mut target = RuntimeCardInstance {
            runtime_id: RuntimeCardId("tgt".into()),
            static_def_ref: StaticCardId("JB01".into()),
            zone: Zone::Field,
            owner: PlayerId("P2".into()),
            hp: 10, armor: 3, energy: 0,
            marks: Default::default(),
        };

        let actions = vec![EffectAction::DealDamage { amount: 5, damage_type: DamageType::Physical }];
        let result = EffectEngine::execute(&actions, &mut source, &mut target, 1);

        assert_eq!(result.damage_dealt, 5);
        assert_eq!(target.hp, 8);  // 10 - (5 - 3 armor) = 8
        assert_eq!(target.armor, 0);
    }

    #[test]
    fn test_payment_non_refundable() {
        let mut source = RuntimeCardInstance {
            runtime_id: RuntimeCardId("src".into()),
            static_def_ref: StaticCardId("GZ01".into()),
            zone: Zone::Field,
            owner: PlayerId("P1".into()),
            hp: 10, armor: 0, energy: 5,
            marks: Default::default(),
        };
        let mut target = RuntimeCardInstance {
            runtime_id: RuntimeCardId("tgt".into()),
            static_def_ref: StaticCardId("JB01".into()),
            zone: Zone::Field,
            owner: PlayerId("P2".into()),
            hp: 10, armor: 0, energy: 0,
            marks: Default::default(),
        };

        let actions = vec![
            EffectAction::PayCost { energy: 3, hp: 0, hand_cards: 0, marks: vec![] },
            EffectAction::ImmuneDamage,
            EffectAction::DealDamage { amount: 10, damage_type: DamageType::Physical },
        ];
        EffectEngine::execute(&actions, &mut source, &mut target, 1);

        // 支付不可退回
        assert_eq!(source.energy, 2);
        // 伤害被免疫
        assert_eq!(target.hp, 10);
    }

    #[test]
    fn test_parse_effect_to_actions_damage() {
        let entry = serde_json::json!({
            "text": "对目标造成3点物理伤害。",
            "mark_refs": []
        });
        let actions = parse_effect_to_actions(&entry);
        assert!(actions.iter().any(|a| matches!(a, EffectAction::DealDamage { .. })));
    }
}
