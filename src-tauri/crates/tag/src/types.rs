use serde::{Deserialize, Serialize};

/// 技能词条（A/B/C 三级编号）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillEntry {
    /// 等级：A / B / C
    pub level: String,
    /// 技能描述文本
    pub description: String,
}

/// 标签数据模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    /// 标签唯一标识，如 tag_01
    pub tag_id: String,
    /// 标签名称
    pub name: String,
    /// 技能词条列表
    pub skill_entries: Vec<SkillEntry>,
    /// 首次出现卡牌
    pub first_appearance: String,
    /// 设计初衷
    pub design_intent: String,
}

/// 标记类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mark {
    /// 标记唯一标识
    pub mark_id: String,
    /// 标记名称
    pub name: String,
}
