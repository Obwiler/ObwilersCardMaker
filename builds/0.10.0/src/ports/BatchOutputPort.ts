import type { Result } from './shared/Result';

export interface BatchConfig {
  outputDir: string;
  format: 'png' | 'svg' | 'pdf';
  dpi: number;
  concurrency?: number;
}

export interface BatchJob {
  cardIds: string[];
  config: BatchConfig;
  status: 'pending' | 'running' | 'done' | 'failed';
  results?: string[];
}

export interface BatchOutputPort {
  generateSet(cardIds: string[], config: BatchConfig): Promise<Result<string[]>>;
}
