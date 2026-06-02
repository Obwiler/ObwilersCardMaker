import {
  AttributeType, CardType, Rarity, Timing, TargetType,
  StackingType, LogicOperator, MarkType,
  MarkExpireBehavior, FilterId, SorterId,
  ValidationLevel
} from "./enums";

// ─── 基础接口 ───────────────────────────────────────────
interface IBase {
  id: string;
  version: string;
  createdAt: number;
  updatedAt: number;
}

// ─── 参数定义 ───────────────────────────────────────────
interface IParamDefinition {
  key: string;
  label: string;
  type: "number" | "string" | "select" | "boolean" | "mark" | "attribute";
  options?: unknown[];
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

export type {
  IBase, IParamDefinition, IAtomicEffect, IAtomicCondition, IAtomicCost,
  IEffectInstance, IConditionInstance, ICostInstance,
  IMarkDefinition, IMarkInstance, ITargetConfig, IFilterConfig, ISorterConfig,
  ISkill, ICard, IValidationResult, IValidationMessage,
  IGameContext, IUnitState, IConfigDefinition
};
