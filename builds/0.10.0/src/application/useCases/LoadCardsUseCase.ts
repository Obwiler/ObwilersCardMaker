import type { CardMeta } from '../../ports/CardRepositoryPort';

export interface LoadCardsUseCase {
  execute(): Promise<CardMeta[]>;
  executeByCategory(category: string): Promise<CardMeta[]>;
}
