export interface CardMeta {
  id: string;
  name: string;
  category: string;
  attributes: Record<string, unknown>;
  version: string;
}

export interface CardBundle {
  meta: CardMeta;
  source: string;
  ast: unknown;
}

export interface RuntimeCardInstance {
  runtimeId: string;
  staticDefRef: string;
  zone: 'deck' | 'hand' | 'field' | 'graveyard' | 'exile';
  owner: string;
  hp: number;
  armor: number;
  energy: number;
  marks: Record<string, number>;
}

export interface CardRepositoryPort {
  listAll(): Promise<string[]>;
  load(id: string): Promise<CardBundle>;
  save(id: string, source: string, meta: CardMeta): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): boolean;
}
