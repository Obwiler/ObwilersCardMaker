import type { BatchJob } from '../../ports/BatchOutputPort';
export interface BatchExportUseCase {
  execute(cardIds: string[], options: Record<string, unknown>): Promise<BatchJob>;
}
