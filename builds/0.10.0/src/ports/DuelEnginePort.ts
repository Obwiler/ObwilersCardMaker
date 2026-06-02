import type { Result } from './shared/Result';

export interface DuelConfig {
  deckPlayer1: string[];
  deckPlayer2: string[];
  startingLife?: number;
  additionalRules?: string[];
}

export interface EffectLogEntry {
  turn: number;
  phase: string;
  sourceId: string;
  effect: string;
  targets: string[];
}

export interface DuelEnginePort {
  initDuel(config: DuelConfig): Promise<void>;
  startTurn(): Promise<number>;
  endTurn(): Promise<number>;
  checkWinCondition(): Promise<Result<number | null>>;
  getEffectLog(): Promise<EffectLogEntry[]>;
}
