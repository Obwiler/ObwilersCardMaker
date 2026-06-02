import type { Result } from './shared/Result';

export interface CardSpec {
  name: string;
  type: string;
  text: string;
  cost?: string;
  power?: number;
  toughness?: number;
  [key: string]: unknown;
}

export interface AIAssistantPort {
  generateCard(prompt: string): Promise<Result<CardSpec>>;
  validateAndFix(card: CardSpec): Promise<Result<CardSpec>>;
  suggestCompletion(partial: string): Promise<Result<string>>;
}
