import {
  AttributeType, CardType, Rarity, Timing, StackingType,
  TargetType, LogicOperator, RelationType
} from "./enums";
import type { IConfigDefinition } from "./interfaces";
import grammarRulesData from '../../data/grammar-rules.json';

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

// ─── 游戏全局常量（来自规则文档一第一章）──────────────
const GAME_CONSTANTS = {
  maxLife: 16,
  maxArmor: 12,
  maxEnergy: 10,
  handSize: 6,
  attacksPerTurn: 1,
  maxCardsPerDeck: 30,
  maxSameCard: 2,
  fatigueDamageStart: 1,
  minPriorityCamp: 1,
  minPriorityCareer: 2,
  minPriorityBuild: 3,
  minPriorityBasic: 4
};

// ─── 默认应用设置（0.9.0）───────────────────────────
const DEFAULT_APP_SETTINGS = {
  outputPaths: {
    cardImageOutputDir: "",
    dataExportDir: "",
    tempFileDir: ""
  },
  cardVisuals: {
    defaultFont: "Microsoft YaHei",
    defaultFontSize: 16,
    defaultTextColor: "#000000",
    qualityColorSchemes: {
      common:    { bgColor: "#9E9E9E", textColor: "#FFFFFF", borderColor: "#757575" },
      rare:      { bgColor: "#42A5F5", textColor: "#FFFFFF", borderColor: "#1E88E5" },
      epic:      { bgColor: "#AB47BC", textColor: "#FFFFFF", borderColor: "#8E24AA" },
      legendary: { bgColor: "#FFA726", textColor: "#FFFFFF", borderColor: "#FB8C00" }
    } as Record<string, { bgColor: string; textColor: string; borderColor: string }>,
    cardWidth: 360,
    cardHeight: 500,
    cardBorderRadius: 16,
    exportScale: 3
  },
  gameConstants: {
    maxHP: 16,
    maxArmor: 12,
    maxEnergy: 10,
    maxHandCards: 6,
    maxDeckSize: 30,
    maxSingleCardCount: 2,
    attacksPerTurn: 1,
    cooldownMin: 0,
    cooldownMax: 99
  },
  editorPreferences: {
    defaultCardType: "基本牌",
    autoSplit: false,
    syntaxCheckLevel: "error-warning" as const
  },
  version: "0.9.0",
  lastModified: ""
};

// ─── 主语标签映射 ───────────────────────────────────
const SUBJECT_LABELS: Record<string, string> = {
  self: "自身",
  target: "目标",
  equipper: "装备者",
  damage_source: "伤害来源",
  attacker: "攻击者",
  all_players: "所有玩家",
  designated_unit: "指定单位",
  other_player: "其他玩家",
  other_unit: "其他单位",
  both_sides: "双方",
  adjacent_unit: "相邻单位",
  purple_effect: "紫卡的效果",
  orange_effect: "橙卡的效果",
  enemy: "敌方",
  unknown: "未知"
};

// ─── 谓语动词标签映射 ───────────────────────────────
const PREDICATE_LABELS: Record<string, string> = {
  deal: "造成",
  gain: "获得",
  lose: "失去",
  restore: "恢复",
  consume: "消耗",
  draw: "抽取",
  discard: "丢弃",
  add: "添加",
  remove: "移除",
  move: "移动",
  switch: "交换",
  summon: "召唤",
  destroy: "摧毁",
  stun: "眩晕",
  silence: "沉默",
  taunt: "嘲讽",
  stealth: "潜行",
  copy: "复制",
  transform: "变形",
  discover: "发现",
  recycle: "回收",
  delay: "延迟",
  execute: "执行",
  grant: "赋予",
  deprive: "剥夺",
  immune: "免疫",
  reflect: "反弹",
  convert: "转化",
  unknown: "未知"
};

// ─── 备注分类标签映射 ───────────────────────────────
const NOTE_CATEGORY_LABELS: Record<string, string> = {
  frequency: "频率限制",
  cap: "上限限制",
  mutual_exclusion: "互斥关系",
  extended: "扩展说明"
};

// ─── 标记流转模式标签映射 ───────────────────────────
const MARK_FLOW_MODE_LABELS: Record<string, string> = {
  accumulate_consume: "累计消耗型",
  accumulate_threshold: "累计阈值型",
  store_release: "存储释放型",
  stack_detonate: "叠加引爆型",
  turn_gain_consume: "回合获消耗型"
};

// ─── 功能标签标签映射 ─────────────────────────────────
const FUNCTIONAL_TAG_LABELS: Record<string, string> = {
  physical_damage: "物理输出",
  magic_damage: "法术输出",
  defense: "防御",
  healing: "治疗",
  resource: "资源运营",
  control: "干扰控制",
  finisher: "终结能力"
};

// ─── 伤害类型标签映射 ───────────────────────────────
const DAMAGE_TYPE_LABELS: Record<string, string> = {
  physical: "物理伤害",
  magic: "法术伤害",
  true: "真实伤害"
};

// ─── 语法校验规则（8条禁止 + 8条自检，从外部 JSON 加载）───────────────
const GRAMMAR_RULES = grammarRulesData;

// ─── 条件分类标签 ───────────────────────────────────
const CONDITION_CATEGORY_LABELS: Record<string, string> = {
  cost: "消耗类",
  trigger: "触发类",
  state: "状态类",
  limit: "限制类"
};

// ─── 宾语分类标签 ───────────────────────────────────
const OBJECT_CATEGORY_LABELS: Record<string, string> = {
  numeric: "数值类",
  card: "卡牌类",
  mark: "标记类",
  resource: "资源类",
  compound: "复合类"
};

// ─── 品质梯度标签 ───────────────────────────────────
const QUALITY_TIER_LABELS: Record<string, string> = {
  basic: "基础（白→蓝量变）",
  advanced: "进阶（蓝→紫质变）",
  transformative: "质变（紫→橙规则突破）",
  rule_breaking: "规则突破"
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
  CORE_CONFIGS,
  GAME_CONSTANTS,
  DEFAULT_APP_SETTINGS,
  SUBJECT_LABELS,
  PREDICATE_LABELS,
  NOTE_CATEGORY_LABELS,
  MARK_FLOW_MODE_LABELS,
  FUNCTIONAL_TAG_LABELS,
  DAMAGE_TYPE_LABELS,
  GRAMMAR_RULES,
  CONDITION_CATEGORY_LABELS,
  OBJECT_CATEGORY_LABELS,
  QUALITY_TIER_LABELS
};
