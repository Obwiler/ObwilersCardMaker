// cardmaker-core: tag — 标签系统基础类型

use serde::{Deserialize, Serialize};

/// 标签
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub description: String,
}

/// 标记（标签的实例，关联到具体卡牌）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mark {
    pub id: String,
    pub tag_id: String,
    pub card_id: String,
    pub note: String,
}