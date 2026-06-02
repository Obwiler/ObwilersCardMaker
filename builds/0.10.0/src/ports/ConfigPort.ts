import type { Result } from './shared/Result';

export interface ConfigPort {
  get<T = string>(key: string): Promise<Result<T>>;
  set(key: string, value: unknown): Promise<void>;
  getJson<T = Record<string, unknown>>(key: string): Promise<Result<T>>;
  setJson(key: string, value: Record<string, unknown>): Promise<void>;
}
