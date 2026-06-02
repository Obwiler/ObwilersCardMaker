export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface ParseErrorInfo {
  source: string;
  line: number;
  column: number;
  message: string;
}

export interface LogPort {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  recordParseError(error: ParseErrorInfo): void;
  getRecentErrors(limit?: number): LogEntry[];
}
