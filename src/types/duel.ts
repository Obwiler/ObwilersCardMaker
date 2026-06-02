// Duel 模块前端类型定义

export type DuelPhase = 'Preparation' | 'FirstPlayerTurn' | 'SecondPlayerTurn' | 'Settlement' | 'End';
export type PlayerSide = 'First' | 'Second';
export type DamageType = 'Physical' | 'Magical' | 'True';

export interface PlayerField {
  name: string; faction: string;
  hp: number; max_hp: number; armor: number;
  energy: number; max_energy: number;
  physical_attack: number; magic_attack: number;
  physical_resist: number; magic_resist: number;
  has_attacked: boolean; attack_count: number;
  hand_cards: string[]; equipment: string[]; skills: string[];
  marks: Record<string, number>; used_tags: string[];
  damage_dealt_this_turn: number; healed_this_turn: number;
}

export interface EffectStackEntry {
  source: string; description: string;
  owner: PlayerSide; target: PlayerSide;
}

export type DuelResult = 'FirstPlayerWin' | 'SecondPlayerWin' | 'Draw';

export interface DuelState {
  phase: DuelPhase; round: number;
  first_player: number; second_player: number;
  fields: [PlayerField, PlayerField];
  active_player: PlayerSide;
  effect_stack: EffectStackEntry[]; effect_log: EffectLogEntry[];
  result: DuelResult | null; scenario_id: string;
}

export interface EffectLogEntry {
  round: number; phase: string; source: string;
  description: string; owner: string;
}

export interface ScenarioCondition { label: string; marks: string[]; }
export interface ScenarioPlayer {
  name: string; faction: string; conditions: ScenarioCondition;
  hp: number; max_hp: number; armor: number;
  energy: number; max_energy: number;
  physical_attack: number; magic_attack: number;
  physical_resist: number; magic_resist: number;
  hand_cards: string[]; equipment: string[]; skills: string[];
}
export interface Scenario {
  id: string; name: string; description: string;
  first_player: ScenarioPlayer; second_player: ScenarioPlayer;
}
export interface ScenarioMatch {
  id: string; name: string; description: string;
  first_matches: number; second_matches: number;
  first_label: string; second_label: string;
}
export interface CardInfo { name: string; list_tags: string[]; }
export interface PhaseInfo { phase: string; name: string; index: number; }