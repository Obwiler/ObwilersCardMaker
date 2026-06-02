import type { RenderOptions } from '../../ports/RenderPort';
export interface RenderCardUseCase {
  execute(cardId: string, options: RenderOptions): Promise<ArrayBuffer>;
  executeBatch(cardIds: string[], options: RenderOptions): Promise<ArrayBuffer[]>;
}
