import type { Result } from './shared/Result';

export interface AssetLoaderPort {
  loadShared(assetPath: string): Promise<Result<ArrayBuffer>>;
  loadCardAsset(cardId: string, assetName: string): Promise<Result<ArrayBuffer>>;
  evictCardCache(cardId: string): Promise<void>;
}
