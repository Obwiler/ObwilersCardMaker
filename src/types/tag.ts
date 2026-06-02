/**
 * 技能词条（A/B/C 三级编号）
 */
export interface SkillEntry {
  /** 等级：A / B / C */
  level: string;
  /** 技能描述文本 */
  description: string;
}

/**
 * 标签数据模型
 */
export interface Tag {
  /** 标签唯一标识 */
  tag_id: string;
  /** 标签名称 */
  name: string;
  /** 技能词条列表 */
  skill_entries: SkillEntry[];
  /** 首次出现卡牌 */
  first_appearance: string;
  /** 设计初衷 */
  design_intent: string;
}

/**
 * 标记类型
 */
export interface Mark {
  /** 标记唯一标识 */
  mark_id: string;
  /** 标记名称 */
  name: string;
}
