export interface ParserPort {
  parse(source: string): Promise<unknown>;
  validate(ast: unknown): Promise<ValidationIssue[]>;
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationIssue {
  ruleId: number;
  message: string;
  severity: 'error' | 'warning';
}
