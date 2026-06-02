//! 效果栈管理器 — LIFO 嵌套效果结算
//!
//! 当一张卡牌的效果触发另一张卡牌的效果时，后者入栈，
//! 按后进先出（LIFO）顺序结算。
//!
//! 栈条目结构：
//!   source_id    — 发起效果的卡牌
//!   target_id    — 接受效果的卡牌/玩家
//!   actions      — 结算指令列表
//!   trigger_text — 触发描述（用于日志）
//!   depth        — 栈深度（0 = 最外层）
//!
//! 结算规则：
//!   1. 新效果 push 到栈顶
//!   2. 每次只结算栈顶（resolve_top）
//!   3. "随后" 连锁效果排在下一层，但不嵌套
//!   4. 栈为空时，效果链完成

use dz_cardmaker_ports::*;
use super::effect_engine::{EffectEngine, EffectAction, SettlementResult};

// ============================================================================
// 栈条目
// ============================================================================

#[derive(Debug, Clone)]
pub struct StackEntry {
    pub source_id: RuntimeCardId,
    pub target_id: RuntimeCardId,
    pub actions: Vec<EffectAction>,
    pub trigger_text: String,
    pub depth: u32,
}

impl StackEntry {
    pub fn new(
        source: &RuntimeCardInstance,
        target: &RuntimeCardInstance,
        actions: Vec<EffectAction>,
        trigger: &str,
        depth: u32,
    ) -> Self {
        Self {
            source_id: source.runtime_id.clone(),
            target_id: target.runtime_id.clone(),
            actions,
            trigger_text: trigger.to_string(),
            depth,
        }
    }
}

// ============================================================================
// 效果栈
// ============================================================================

pub struct EffectStack {
    stack: Vec<StackEntry>,
    resolution_log: Vec<String>,
    max_depth: u32,
}

impl EffectStack {
    pub fn new() -> Self {
        Self {
            stack: Vec::new(),
            resolution_log: Vec::new(),
            max_depth: 0,
        }
    }

    /// 将一个效果推入栈顶
    pub fn push(
        &mut self,
        source: &RuntimeCardInstance,
        target: &RuntimeCardInstance,
        actions: Vec<EffectAction>,
        trigger: &str,
    ) {
        let depth = self.stack.len() as u32 + 1;
        self.max_depth = self.max_depth.max(depth);

        self.stack.push(StackEntry::new(source, target, actions, trigger, depth));
        self.resolution_log.push(format!(
            "[深度 {}] {} → {}：{}",
            depth,
            source.runtime_id.0,
            target.runtime_id.0,
            trigger,
        ));
    }

    /// 结算栈顶的一个效果
    /// 返回 None 表示栈已空
    pub fn resolve_top(
        &mut self,
        source: &mut RuntimeCardInstance,
        target: &mut RuntimeCardInstance,
        turn: u32,
    ) -> Option<SettlementResult> {
        let entry = self.stack.pop()?;

        self.resolution_log.push(format!(
            "[结算 深度 {}] {} → {}：{}",
            entry.depth,
            entry.source_id.0,
            entry.target_id.0,
            entry.trigger_text,
        ));

        // Delegate to EffectEngine
        let result = EffectEngine::execute(&entry.actions, source, target, turn);

        self.resolution_log.push(format!(
            "[完成 深度 {}] 伤害:{}, 恢复:{}, 连锁:{}",
            entry.depth,
            result.damage_dealt,
            result.hp_restored + result.energy_restored,
            result.chain_actions.len(),
        ));

        Some(result)
    }

    /// 结算整个栈（将所有条目弹出结算）
    /// 返回所有结算结果的完全日志
    pub fn resolve_all(
        &mut self,
        source: &mut RuntimeCardInstance,
        target: &mut RuntimeCardInstance,
        turn: u32,
    ) -> Vec<SettlementResult> {
        let mut results = Vec::new();
        while self.size() > 0 {
            if let Some(result) = self.resolve_top(source, target, turn) {
                results.push(result);
            }
        }
        results
    }

    /// 栈中待结算的效果数
    pub fn size(&self) -> usize {
        self.stack.len()
    }

    /// 栈是否为空
    pub fn is_empty(&self) -> bool {
        self.stack.is_empty()
    }

    /// 获取当前最大深度
    pub fn max_depth_reached(&self) -> u32 {
        self.max_depth
    }

    /// 获取结算日志
    pub fn log(&self) -> &Vec<String> {
        &self.resolution_log
    }

    /// 清空栈（强制终止所有效果）
    pub fn clear(&mut self) {
        self.stack.clear();
        self.resolution_log.push("[清空] 效果栈已强制清空".into());
    }

    /// 查看栈顶（不弹出）
    pub fn peek(&self) -> Option<&StackEntry> {
        self.stack.last()
    }
}

impl Default for EffectStack {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// 效果触发总线
// ============================================================================

/// 效果总线：当事件发生时，所有监听者各自将效果推入栈。
/// 调用时机：
///   - 受到伤害时 → bus.trigger("damage_received", ...)
///   - 回合开始时 → bus.trigger("turn_start", ...)
///   - 卡牌打出时 → bus.trigger("card_played", ...)

pub struct EffectBus {
    listeners: Vec<Box<dyn Fn(&str, &RuntimeCardInstance, &RuntimeCardInstance) -> Vec<EffectAction>>>,
}

impl EffectBus {
    pub fn new() -> Self {
        Self { listeners: Vec::new() }
    }

    pub fn register<F>(&mut self, listener: F)
    where
        F: Fn(&str, &RuntimeCardInstance, &RuntimeCardInstance) -> Vec<EffectAction> + 'static,
    {
        self.listeners.push(Box::new(listener));
    }

    pub fn trigger(
        &self,
        event: &str,
        source: &RuntimeCardInstance,
        target: &RuntimeCardInstance,
    ) -> Vec<EffectAction> {
        let mut all_actions = Vec::new();
        for listener in &self.listeners {
            all_actions.extend(listener(event, source, target));
        }
        all_actions
    }
}

impl Default for EffectBus {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::battlefield::effect_engine::DamageType;

    fn make_instance(id: &str, hp: u32, energy: u32, armor: u32) -> RuntimeCardInstance {
        RuntimeCardInstance {
            runtime_id: RuntimeCardId(id.into()),
            static_def_ref: StaticCardId("TEST".into()),
            zone: Zone::Field,
            owner: PlayerId("P1".into()),
            hp, armor, energy,
            marks: Default::default(),
        }
    }

    #[test]
    fn test_stack_lifo_order() {
        let mut source = make_instance("src", 10, 10, 0);
        let mut target = make_instance("tgt", 10, 10, 0);

        let mut stack = EffectStack::new();
        assert!(stack.is_empty());

        // Push nested effects
        stack.push(&source, &target,
            vec![EffectAction::DealDamage { amount: 3, damage_type: DamageType::Physical }],
            "效果A");
        stack.push(&source, &target,
            vec![EffectAction::DealDamage { amount: 5, damage_type: DamageType::Physical }],
            "效果B");

        assert_eq!(stack.size(), 2);

        // Resolve top first (LIFO: 效果B first)
        let r = stack.resolve_top(&mut source, &mut target, 1).unwrap();
        assert_eq!(r.damage_dealt, 5);
        assert_eq!(target.hp, 5); // 10 - 5
        assert_eq!(stack.size(), 1);

        // Resolve remaining (效果A)
        let r2 = stack.resolve_top(&mut source, &mut target, 1).unwrap();
        assert_eq!(r2.damage_dealt, 3);
        assert_eq!(target.hp, 2); // 5 - 3
        assert!(stack.is_empty());
    }

    #[test]
    fn test_stack_nested_depth() {
        let mut source = make_instance("src", 10, 10, 0);
        let mut target = make_instance("tgt", 10, 10, 0);
        let mut stack = EffectStack::new();

        for i in 0..5 {
            stack.push(&source, &target,
                vec![EffectAction::RestoreHp { amount: 1 }],
                &format!("嵌套效果{}", i));
        }

        assert_eq!(stack.size(), 5);
        assert_eq!(stack.max_depth_reached(), 5);

        // Resolve all
        let results = stack.resolve_all(&mut source, &mut target, 1);
        assert_eq!(results.len(), 5);
        assert!(stack.is_empty());
        assert_eq!(target.hp, 15); // 10 + 5*1 = 15
    }

    #[test]
    fn test_effect_bus_basic() {
        let mut bus = EffectBus::new();
        bus.register(|event, _source, _target| {
            if event == "damage_received" {
                vec![EffectAction::GainArmor { amount: 2 }]
            } else {
                vec![]
            }
        });

        let src = make_instance("src", 10, 10, 0);
        let tgt = make_instance("tgt", 10, 10, 0);
        let actions = bus.trigger("damage_received", &src, &tgt);
        assert!(!actions.is_empty());
    }
}
