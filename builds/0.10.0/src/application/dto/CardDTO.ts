export interface CardDTO {
  id: string;
  name: string;
  category: string;
  version: string;
  status: string;
  attributes: Record<string, unknown>;
}
