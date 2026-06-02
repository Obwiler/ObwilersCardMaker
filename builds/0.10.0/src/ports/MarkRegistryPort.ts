import type { Result } from './shared/Result';

export interface MarkDefinition {
  id: string;
  name: string;
  type: string;
  description: string;
  rules: Record<string, unknown>;
}

export interface MarkRegistryPort {
  listAll(): Promise<MarkDefinition[]>;
  getType(markId: string): Promise<Result<string>>;
  isValid(markId: string): Promise<boolean>;
}
