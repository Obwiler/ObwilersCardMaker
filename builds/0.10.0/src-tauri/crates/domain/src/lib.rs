//! DZ CardMaker — 领域层实体定义
//!
//! L3 纯逻辑层，零外部依赖（仅依赖 ports crate 的基础类型）。
//! 这里定义 Card、Mark、Effect、Rule 等游戏领域的核心类型。

use dz_cardmaker_ports::{StaticCardId, CardMeta, RuntimeCardId, MarkId, PlayerId};

// ============================================================================
// Card — 编译后的静态卡牌定义
// ============================================================================

/// 编译后的卡牌定义（静态，不可变）
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Card {
    pub meta: CardMeta,
    pub ast: CardAst,
}

/// DZ 语法解析后的抽象语法树
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CardAst {
    pub category: CardCategory,
    pub attributes: CardAttributes,
    pub effects: Vec<EffectBlock>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum CardCategory {
    Faction,
    Career,
    Construct(ConstructSubType),
    Basic(BasicQuality),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ConstructSubType {
    Blade,
    Treasure,
    Armor,
    Martial,
    Spell,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum BasicQuality {
    White,
    Blue,
    Purple,
    Orange,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CardAttributes {
    pub life: Option<u32>,
    pub armor: Option<u32>,
    pub energy: Option<u32>,
    pub is_passive: bool,
}

/// 效果块 — 可含条件触发、分支、多选一等
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EffectBlock {
    pub trigger: Option<String>,
    pub entries: Vec<EffectEntry>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum EffectEntry {
    Simple(EffectLine),
    Branch(BranchEntry),
    Options(Vec<EffectLine>),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BranchEntry {
    pub condition: String,
    pub entries: Vec<EffectEntry>,
}

/// 单条效果 — 五段式（条件/主/谓/宾/备注）
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EffectLine {
    pub condition: Option<String>,
    pub subject: Option<String>,
    pub predicate: String,
    pub object: String,
    pub remark: Option<String>,
}

// ============================================================================
// Mark — 标记定义（纯资源，不绑定卡牌效果）
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Mark {
    pub id: MarkId,
    pub mark_type: MarkType,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum MarkType {
    Cumulative,    // 累计消耗型
    Threshold,     // 层数阈值型
    StoredRelease, // 存储释放型
    StackDetonate, // 叠加引爆型
    TurnGain,      // 回合获取型
}

// ============================================================================
// Rule — 规则条目
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Rule {
    pub condition: Option<String>,
    pub subject: Option<String>,
    pub predicate: String,
    pub object: String,
    pub remark: Option<String>,
}

// ============================================================================
// 对战相关类型
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DuelState {
    pub players: Vec<PlayerState>,
    pub turn: u32,
    pub phase: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PlayerState {
    pub id: PlayerId,
    pub faction: StaticCardId,
    pub career: StaticCardId,
    pub hand: Vec<RuntimeCardId>,
    pub field: Vec<RuntimeCardId>,
    pub deck_count: u32,
    pub graveyard: Vec<RuntimeCardId>,
}
