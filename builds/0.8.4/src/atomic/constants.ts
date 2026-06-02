import {
  AttributeType, CardType, Rarity, Timing, StackingType,
  TargetType, LogicOperator, RelationType
} from "./enums";
import type { IConfigDefinition } from "./interfaces";

// ─── 默认配置：游戏参数 ─────────────────────────────────
const DEFAULT_CONFIG = {
  maxDeckSize: 30,
  maxCardCount: 2,
  maxAttributeValues: {
    [AttributeType.LIFE]: 16,
    [AttributeType.ARMOR]: 12,
    [AttributeType.ENERGY]: 10,
    [AttributeType.ATTACK]: 10,
    [AttributeType.DEFENSE]: 10,
    [AttributeType.SPEED]: 10,
    [AttributeType.CRIT_RATE]: 100
  } as Record<AttributeType, number>,
  minCooldown: 0,
  maxCooldown: 99,
  defaultMarkMaxStack: 99,
  defaultMarkDuration: 0
};

// ─── 卡牌视觉参数 ───────────────────────────────────────
const CARD_VISUAL = {
  width: 360,
  height: 500,
  borderRadius: 16,
  exportScale: 3
};

// ─── 品质颜色配置 ───────────────────────────────────────
const RARITY_COLORS = {
  [Rarity.WHITE]: { background: "#f5f5f5", text: "#000000", border: "#d9d9d9" },
  [Rarity.BLUE]: { background: "#e6f7ff", text: "#0050b3", border: "#91d5ff" },
  [Rarity.PURPLE]: { background: "#f9f0ff", text: "#531dab", border: "#d3adf7" },
  [Rarity.ORANGE]: { background: "#fff7e6", text: "#d46b08", border: "#ffd591" }
};

// ─── 限制常量 ───────────────────────────────────────────
const MAX_SKILLS_PER_CARD = 5;
const MAX_TAGS_PER_CARD = 10;
const MAX_NAME_LENGTH = 50;

// ─── 品质标签名称映射 ───────────────────────────────────
const RARITY_LABELS: Record<Rarity, string> = {
  [Rarity.WHITE]: "普通",
  [Rarity.BLUE]: "稀有",
  [Rarity.PURPLE]: "史诗",
  [Rarity.ORANGE]: "传说"
};

// ─── 卡牌类型标签名称映射 ───────────────────────────────
const CARD_TYPE_LABELS: Record<CardType, string> = {
  [CardType.BASIC]: "基本牌",
  [CardType.CAMP]: "阵营牌",
  [CardType.CAREER]: "职业牌",
  [CardType.BUILD_WEAPON]: "兵刃",
  [CardType.BUILD_TREASURE]: "宝器",
  [CardType.BUILD_ARMOR]: "甲胄",
  [CardType.BUILD_MARTIAL]: "武学",
  [CardType.BUILD_SPELL]: "术法"
};

// ─── 时机标签名称映射 ───────────────────────────────
const TIMING_LABELS: Record<Timing, string> = {
  [Timing.IMMEDIATE]: "立即",
  [Timing.TURN_START]: "回合开始时",
  [Timing.TURN_END]: "回合结束时",
  [Timing.BIG_TURN_START]: "大回合开始时",
  [Timing.BIG_TURN_END]: "大回合结束时",
  [Timing.ON_DAMAGE_TAKEN]: "受到伤害时",
  [Timing.ON_DAMAGE_DEALT]: "造成伤害时",
  [Timing.ON_CARD_DRAWN]: "抽牌时",
  [Timing.ON_CARD_PLAYED]: "出牌时",
  [Timing.ON_CARD_DISCARDED]: "弃牌时",
  [Timing.ON_MARK_ADDED]: "获得标记时",
  [Timing.ON_MARK_REMOVED]: "失去标记时",
  [Timing.PERMANENT]: "常驻",
  [Timing.UNKNOWN]: "未知"
};

// ─── 叠加类型标签名称映射 ─────────────────────────────
const STACKING_LABELS: Record<StackingType, string> = {
  [StackingType.REPLACE]: "替换",
  [StackingType.ADD_VALUE]: "叠加数值",
  [StackingType.ADD_PERCENT]: "叠加百分比",
  [StackingType.ADD_COUNT]: "叠加层数",
  [StackingType.UNKNOWN]: "未知"
};

// ─── 目标类型标签名称映射 ─────────────────────────────
const TARGET_TYPE_LABELS: Record<TargetType, string> = {
  [TargetType.SELF]: "自己",
  [TargetType.ONE_ENEMY]: "一名敌方",
  [TargetType.ONE_ALLY]: "一名友方",
  [TargetType.ONE_UNIT]: "一名单位",
  [TargetType.DAMAGE_SOURCE]: "伤害来源",
  [TargetType.TRIGGER_UNIT]: "触发单位",
  [TargetType.INHERIT]: "承接主体",
  [TargetType.ALL_ENEMIES]: "所有敌方",
  [TargetType.ALL_ALLIES]: "所有友方",
  [TargetType.ALL_UNITS]: "所有单位",
  [TargetType.ALL_ALIVE]: "所有存活单位",
  [TargetType.ALL_DEAD]: "所有阵亡单位",
  [TargetType.ADJACENT]: "相邻单位",
  [TargetType.ADJACENT_ENEMY]: "相邻敌方",
  [TargetType.ADJACENT_ALLY]: "相邻友方",
  [TargetType.LEFT_ADJACENT]: "左侧相邻",
  [TargetType.RIGHT_ADJACENT]: "右侧相邻",
  [TargetType.RANDOM_ENEMY]: "随机敌方",
  [TargetType.RANDOM_ALLY]: "随机友方",
  [TargetType.RANDOM_UNIT]: "随机单位",
  [TargetType.LOWEST_LIFE]: "生命最低",
  [TargetType.HIGHEST_LIFE]: "生命最高",
  [TargetType.LOWEST_ARMOR]: "护甲最低",
  [TargetType.HIGHEST_ARMOR]: "护甲最高",
  [TargetType.LOWEST_ENERGY]: "技力最低",
  [TargetType.HIGHEST_ENERGY]: "技力最高"
};

// ─── 逻辑运算符标签名称映射 ──────────────────────────
const LOGIC_LABELS: Record<LogicOperator, string> = {
  [LogicOperator.AND]: "且",
  [LogicOperator.OR]: "或",
  [LogicOperator.NOT]: "非",
  [LogicOperator.UNKNOWN]: "未知"
};

// ─── 属性类型标签名称映射 ─────────────────────────────
const ATTRIBUTE_LABELS: Record<AttributeType, string> = {
  [AttributeType.LIFE]: "生命",
  [AttributeType.ARMOR]: "护甲",
  [AttributeType.ENERGY]: "技力",
  [AttributeType.ATTACK]: "攻击",
  [AttributeType.DEFENSE]: "防御",
  [AttributeType.SPEED]: "速度",
  [AttributeType.CRIT_RATE]: "暴击率",
  [AttributeType.UNKNOWN]: "未知"
};

// ─── 关系类型标签名称映射 ─────────────────────────────
const RELATION_LABELS: Record<RelationType, string> = {
  [RelationType.ENEMY]: "敌方",
  [RelationType.ALLY]: "友方",
  [RelationType.NEUTRAL]: "中立"
};

// ─── 核心配置项定义（用于配置管理 UI）────────────────────
const CORE_CONFIGS: Record<string, IConfigDefinition> = {
  maxDeckSize: {
    key: "maxDeckSize",
    label: "卡组大小上限",
    type: "number",
    default: 30,
    min: 1,
    max: 100,
    category: "game"
  },
  maxCardCount: {
    key: "maxCardCount",
    label: "单卡数量上限",
    type: "number",
    default: 2,
    min: 1,
    max: 10,
    category: "game"
  },
  maxLife: {
    key: "maxLife",
    label: "生命上限",
    type: "number",
    default: 16,
    min: 1,
    max: 999,
    category: "game"
  },
  maxArmor: {
    key: "maxArmor",
    label: "护甲上限",
    type: "number",
    default: 12,
    min: 1,
    max: 999,
    category: "game"
  },
  maxEnergy: {
    key: "maxEnergy",
    label: "技力上限",
    type: "number",
    default: 10,
    min: 1,
    max: 999,
    category: "game"
  },
  cardWidth: {
    key: "cardWidth",
    label: "卡牌宽度",
    type: "number",
    default: 360,
    min: 100,
    max: 1000,
    category: "visual"
  },
  cardHeight: {
    key: "cardHeight",
    label: "卡牌高度",
    type: "number",
    default: 500,
    min: 100,
    max: 1000,
    category: "visual"
  },
  borderRadius: {
    key: "borderRadius",
    label: "卡牌圆角",
    type: "number",
    default: 16,
    min: 0,
    max: 100,
    category: "visual"
  },
  exportScale: {
    key: "exportScale",
    label: "导出倍率",
    type: "number",
    default: 3,
    min: 1,
    max: 10,
    category: "export"
  }
};

export {
  DEFAULT_CONFIG,
  CARD_VISUAL,
  RARITY_COLORS,
  MAX_SKILLS_PER_CARD,
  MAX_TAGS_PER_CARD,
  MAX_NAME_LENGTH,
  RARITY_LABELS,
  CARD_TYPE_LABELS,
  TIMING_LABELS,
  STACKING_LABELS,
  TARGET_TYPE_LABELS,
  LOGIC_LABELS,
  ATTRIBUTE_LABELS,
  RELATION_LABELS,
  CORE_CONFIGS
};
