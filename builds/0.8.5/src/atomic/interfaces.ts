import {
  AttributeType, CardType, Rarity, Timing, TargetType,
  StackingType, LogicOperator, MarkType,
  MarkExpireBehavior, FilterId, SorterId,
  ValidationLevel, EffectLevel, SubjectType, PredicateType,
  NoteCategory, MarkFlowMode, FunctionalTag, MarkSourceType
} from "./enums";

// ─── 基础接口 ───────────────────────────────────────────
interface IBase {
  id: string;
  version: string;
  createdAt: number;
  updatedAt: number;
}

// ─── 参数定义 ───────────────────────────────────────────
export interface ISelectOption {
  label: string;
  value: string;
}

interface IParamDefinition {
  key: string;
  label: string;
  type: "number" | "string" | "select" | "boolean" | "mark" | "attribute";
  options?: ISelectOption[];
  min?: number;
  max?: number;
  default: unknown;
  required: boolean;
}

// ─── 原子效果模板 ───────────────────────────────────────
interface IAtomicEffect extends IBase {
  type: string;
  name: string;
  description: string;
  params: IParamDefinition[];
}

// ─── 原子条件模板 ───────────────────────────────────────
interface IAtomicCondition extends IBase {
  type: string;
  name: string;
  description: string;
  params: IParamDefinition[];
}

// ─── 原子消耗模板 ───────────────────────────────────────
interface IAtomicCost extends IBase {
  type: string;
  name: string;
  description: string;
  params: IParamDefinition[];
}

// ─── 效果实例 ───────────────────────────────────────────
interface IEffectInstance {
  effectId: string;
  params: Record<string, unknown>;
  condition?: IConditionInstance;
  timing: Timing;
  stacking: StackingType;
  target: TargetType;
  inheritTarget?: string;
  saveAsInherit?: string;
  limit?: { type: "per_turn" | "per_big_turn" | "per_game" | "per_use"; count: number };
}

// ─── 条件实例 ───────────────────────────────────────────
interface IConditionInstance {
  conditionId: string;
  params: Record<string, unknown>;
  logic?: LogicOperator;
  target?: TargetType;
  saveAsInherit?: string;
}

// ─── 消耗实例 ───────────────────────────────────────────
interface ICostInstance {
  costId: string;
  params: Record<string, unknown>;
}

// ─── 标记定义 ───────────────────────────────────────────
interface IMarkDefinition extends IBase {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  type: MarkType;
  maxStack: number;
  duration: number;
  stackingType: StackingType;
  expireBehavior: MarkExpireBehavior;
  onAdd?: IEffectInstance[];
  onRemove?: IEffectInstance[];
  onStackChange?: IEffectInstance[];
  onExpire?: IEffectInstance[];
}

// ─── 标记实例 ───────────────────────────────────────────
interface IMarkInstance {
  markId: string;
  targetId: string;
  stack: number;
  remainingDuration: number;
  sourceId?: string;
  type?: MarkType;
}

// ─── 目标配置 ───────────────────────────────────────────
interface ITargetConfig {
  type: TargetType;
  filters: IFilterConfig[];
  sorters?: ISorterConfig[];
  limit: number;
}

// ─── 过滤器配置 ─────────────────────────────────────────
interface IFilterConfig {
  filterId: FilterId;
  params: Record<string, unknown>;
  logic: LogicOperator;
}

// ─── 排序器配置 ─────────────────────────────────────────
interface ISorterConfig {
  sorterId: SorterId;
  params: Record<string, unknown>;
}

// ─── 技能 ───────────────────────────────────────────────
interface ISkill extends IBase {
  name: string;
  description: string;
  conditions: IConditionInstance[];
  costs: ICostInstance[];
  effects: IEffectInstance[];
  cooldown: number;
  useLimit: number;
  isPassive: boolean;
}

// ─── 卡牌 ───────────────────────────────────────────────
interface ICard extends IBase {
  name: string;
  displayName: string;
  type: CardType;
  subType?: string;
  rarity: Rarity;
  skills: ISkill[];
  tags: string[];
  mutuallyExclusive: string[];
  baseStats: Partial<Record<AttributeType, number>>;
  maxCount: number;
  priority: number;
  description: string;
  flavorText?: string;
  customMarks?: IMarkDefinition[];
  coolDown?: number;
  useLimit?: number;
  /** 卡面字体（CSS font-family） */
  cardFontFamily?: string;
  /** 卡面字号（px） */
  cardFontSize?: number;
  /** 卡面文字颜色（hex，如 #ffffff） */
  cardTextColor?: string;
  /** 0.9.0 五段式效果列表 */
  fiveSegmentEffects?: IFiveSegmentEffect[];
  /** 功能标签 */
  functionalTags?: FunctionalTag[];
  /** 卡牌品质（基本牌专用） */
  quality?: Rarity;
  /** 牌组内数量（基本牌专用） */
  quantityInDeck?: number;
  /** 构筑卡消耗 */
  buildCost?: number;
  /** 构筑卡互斥卡牌 */
  exclusiveTo?: string;
  /** 卡牌所属分类路径（如 "basics/white"） */
  categoryPath?: string;
}

// ─── 校验结果 ───────────────────────────────────────────
interface IValidationResult {
  success: boolean;
  errors: IValidationMessage[];
  warnings: IValidationMessage[];
}

// ─── 校验消息 ───────────────────────────────────────────
interface IValidationMessage {
  ruleId: string;
  level: ValidationLevel;
  message: string;
}

// ─── 游戏上下文 ─────────────────────────────────────────
interface IGameContext {
  currentUnit: IUnitState;
  units: IUnitState[];
  adjacencyMap: Map<string, string[]>;
  turnNumber: number;
  bigTurnNumber: number;
  deckRemaining: number;
}

// ─── 单位状态 ───────────────────────────────────────────
interface IUnitState {
  id: string;
  isSelf: boolean;
  isEnemy: boolean;
  isAlly: boolean;
  isAlive: boolean;
  position: number;
  attributes: Record<AttributeType, number>;
  baseStats: Record<string, number>;
  marks: IMarkInstance[];
  handSize: number;
  handCount: number;
  handTypes: string[];
  distance: number;
  equipmentType?: string;
  buffTypes: string[];
  debuffTypes: string[];
  equipmentSlots: Record<string, string | null>;
}

// ─── 配置项 ─────────────────────────────────────────────
interface IConfigDefinition {
  key: string;
  label: string;
  type: "number" | "string" | "select" | "boolean";
  default: unknown;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string | number }>;
  category: "game" | "visual" | "export";
}

// ─── 五段式效果条目（0.9.0 核心数据模型）───────────────
interface IFiveSegmentEffect {
  id: string;
  level: EffectLevel;
  sortOrder: number;
  condition: string;
  subject: SubjectType;
  predicate: PredicateType;
  object: string;
  note?: string;
  noteCategory?: NoteCategory;
  parentId?: string;
  isAutoSplit?: boolean;
}

// ─── 备注模板 ─────────────────────────────────────────
interface INoteTemplate {
  id: string;
  category: NoteCategory;
  template: string;
  description: string;
  params?: IParamDefinition[];
}

// ─── 谓语动词定义 ─────────────────────────────────────
interface IPredicateDefinition {
  id: PredicateType;
  name: string;
  description: string;
  applicableObjectCategories: string[];
  examples: string[];
}

// ─── 主语定义 ─────────────────────────────────────────
interface ISubjectDefinition {
  id: SubjectType;
  name: string;
  description: string;
}

// ─── 条件模板（五段式）────────────────────────────────
interface IConditionTemplate {
  id: string;
  category: "cost" | "trigger" | "state" | "limit";
  template: string;
  description: string;
  params?: IParamDefinition[];
}

// ─── 宾语模板（五段式）────────────────────────────────
interface IObjectTemplate {
  id: string;
  category: "numeric" | "card" | "mark" | "resource" | "compound";
  template: string;
  description: string;
  params?: IParamDefinition[];
}

// ─── 标记卡牌定义（独立于普通卡牌）────────────────────
interface IMarkCardDefinition extends IBase {
  name: string;
  displayName: string;
  description: string;
  sourceType: MarkSourceType;
  sourceCard?: string;
  productionMethod: string;
  consumptionMethod: string;
  maxStack: number;
  flowMode: MarkFlowMode;
  effects: IFiveSegmentEffect[];
  onAddEffects?: IFiveSegmentEffect[];
  onRemoveEffects?: IFiveSegmentEffect[];
  onStackChangeEffects?: IFiveSegmentEffect[];
  icon?: string;
  color?: string;
}

// ─── 语法校验规则定义 ─────────────────────────────────
interface IGrammarRule {
  id: string;
  name: string;
  description: string;
  level: ValidationLevel;
  check: "forbidden_combination" | "self_check";
}

// ─── 品质配色方案 ─────────────────────────────────────
interface IQualityColorScheme {
  bgColor: string;
  textColor: string;
  borderColor: string;
}

// ─── 应用全局设置（0.9.0）─────────────────────────────
interface IAppSettings {
  outputPaths: {
    cardImageOutputDir: string;
    dataExportDir: string;
    tempFileDir: string;
  };
  cardVisuals: {
    defaultFont: string;
    defaultFontSize: number;
    defaultTextColor: string;
    qualityColorSchemes: Record<string, IQualityColorScheme>;
    cardWidth: number;
    cardHeight: number;
    cardBorderRadius: number;
    exportScale: number;
  };
  gameConstants: {
    maxHP: number;
    maxArmor: number;
    maxEnergy: number;
    maxHandCards: number;
    maxDeckSize: number;
    maxSingleCardCount: number;
    attacksPerTurn: number;
    cooldownMin: number;
    cooldownMax: number;
  };
  editorPreferences: {
    defaultCardType: string;
    autoSplit: boolean;
    syntaxCheckLevel: "error-only" | "error-warning" | "all";
  };
  version: string;
  lastModified: string;
}

// ─── 卡牌数据库索引 ───────────────────────────────────
interface ICardDBIndex {
  totalCards: number;
  categories: {
    camps: number;
    careers: number;
    builds: { weapons: number; treasures: number; armors: number; martials: number; spells: number };
    basics: { white: number; blue: number; purple: number; orange: number };
    marks: number;
  };
  lastUpdated: number;
}

export type {
  IBase, IParamDefinition, IAtomicEffect, IAtomicCondition, IAtomicCost,
  IEffectInstance, IConditionInstance, ICostInstance,
  IMarkDefinition, IMarkInstance, ITargetConfig, IFilterConfig, ISorterConfig,
  ISkill, ICard, IValidationResult, IValidationMessage,
  IGameContext, IUnitState, IConfigDefinition,
  IFiveSegmentEffect, INoteTemplate, IPredicateDefinition, ISubjectDefinition,
  IConditionTemplate, IObjectTemplate, IMarkCardDefinition, IGrammarRule,
  IAppSettings, ICardDBIndex, IQualityColorScheme
};
