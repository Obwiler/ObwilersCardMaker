// 统一导出入口 — 所有类型定义
export type { SkillEntry, Tag, Mark } from './tag';
export type {
  CardEntry,
  TagEntry,
  TagDef,
  CardAst,
  ParseError,
  ParseResult,
  Card,
  ValidationError,
  CardValidation,
  ParseStats,
} from './parser';
export type {
  DuelPhase,
  PlayerSide,
  DamageType,
  PlayerField,
  DuelState,
  EffectLogEntry,
  PhaseInfo,
  Scenario,
  ScenarioPlayer,
  ScenarioMatch,
} from './duel';