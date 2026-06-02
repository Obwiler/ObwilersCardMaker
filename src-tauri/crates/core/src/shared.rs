// shared.rs — 跨 crate 共享基础类型

use serde::{Deserialize, Serialize};

// ===== 五段式卡牌条目（消除 parser::CardEntry / duel::CardEntry / parser::TagEntry 重复）=====
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FiveStageEntry {
    pub id: String,
    pub condition: String,
    pub subject: String,
    pub predicate: String,
    pub object: String,
    pub note: String,
}

// ===== PlayerSide（消除 duel 中的重复，统一 Self_/Opponent + First/Second）=====
// 注意：First=0, Second=1 保持 usize 值兼容 duel::field(side as usize) 数组索引
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum PlayerSide {
    #[serde(rename = "first")]
    First = 0,
    #[serde(rename = "second")]
    Second = 1,
    #[serde(rename = "self")]
    Self_ = 2,
    #[serde(rename = "opponent")]
    Opponent = 3,
}

impl PlayerSide {
    pub fn opponent(&self) -> PlayerSide {
        match self {
            PlayerSide::First => PlayerSide::Second,
            PlayerSide::Second => PlayerSide::First,
            PlayerSide::Self_ => PlayerSide::Opponent,
            PlayerSide::Opponent => PlayerSide::Self_,
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            PlayerSide::First => "先手方",
            PlayerSide::Second => "后手方",
            PlayerSide::Self_ => "自身方",
            PlayerSide::Opponent => "对方",
        }
    }
}

// ===== 伤害类型（消除 duel 中的重复）=====
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum DamageType {
    Physical,
    Magical,
    True,
    PercentCurrent,
    PercentMax,
}

// ===== 通用解析/校验结果 =====
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    pub success: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}
