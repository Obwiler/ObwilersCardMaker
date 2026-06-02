import type { Result } from './shared/Result';

export interface CardInstance {
  id: string;
  cardId: string;
  owner: number;
  tapped: boolean;
  counters: Record<string, number>;
}

export interface PlayerState {
  hand: CardInstance[];
  field: CardInstance[];
  graveyard: CardInstance[];
  life: number;
}

export interface SnapshotData {
  turn: number;
  phase: string;
  players: PlayerState[];
  timestamp: number;
}

export interface BattlefieldPort {
  initGame(playerCount: number): Promise<void>;
  getPlayerHand(playerIndex: number): Promise<CardInstance[]>;
  getPlayerField(playerIndex: number): Promise<CardInstance[]>;
  drawCard(playerIndex: number): Promise<Result<CardInstance>>;
  playCard(playerIndex: number, handIndex: number): Promise<Result<void>>;
  getTurn(): Promise<number>;
  getPhase(): Promise<string>;
  saveSnapshot(tag: string): Promise<void>;
  loadSnapshot(tag: string): Promise<Result<SnapshotData>>;
}
