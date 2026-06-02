import type { RenderOptions } from '../../ports/RenderPort';
export interface RenderRequestDTO {
  cardIds: string[];
  options: RenderOptions;
}
