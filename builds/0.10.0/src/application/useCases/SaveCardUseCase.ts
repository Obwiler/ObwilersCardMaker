import type { CardMeta } from '../../ports/CardRepositoryPort';
export interface SaveCardUseCase {
  execute(card: CardMeta): Promise<void>;
}
