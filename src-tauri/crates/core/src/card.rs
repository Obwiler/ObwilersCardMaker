// cardmaker-core: card — 卡牌基础数据结构
// 被 engine/tag, engine/parser, engine/duel, engine/scenario 共同依赖

use serde::{Deserialize, Serialize};

/// 卡牌唯一标识
pub type CardId = String;

/// 一张卡牌的核心数据（不含解析中间态）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub id: CardId,
    pub name: String,
    pub tags: Vec<String>,
    pub text: String,
}

/// 卡牌区域
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Zone {
    Deck,
    Hand,
    Field,
    Graveyard,
    Exile,
}

/// 卡牌属性值
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stat {
    pub name: String,
    pub value: i32,
}