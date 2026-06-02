import type { Result } from './shared/Result';

export interface RenderOptions {
  width: number;
  height: number;
  dpi: number;
  format: 'png' | 'svg' | 'pdf';
  bleedMargin: number;
}

export interface RenderPort {
  renderCard(cardId: string, options?: Partial<RenderOptions>): Promise<Result<ArrayBuffer>>;
  renderPreview(cardId: string, page?: number): Promise<Result<string>>;
}
