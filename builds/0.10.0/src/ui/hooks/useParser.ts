import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ParseError, ValidationIssue } from '../../ports/ParserPort';

interface UseParserReturn {
  parse: (source: string) => Promise<unknown>;
  validate: (source: string) => Promise<void>;
  parseResult: unknown;
  issues: ValidationIssue[];
  parseError: ParseError | null;
}

export function useParser(): UseParserReturn {
  const [parseResult, setParseResult] = useState<unknown>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [parseError, setParseError] = useState<ParseError | null>(null);

  const parse = useCallback(async (source: string): Promise<unknown> => {
    setParseError(null);
    try {
      const json = await invoke<string>('parse_dz', { source });
      const ast = JSON.parse(json);
      setParseResult(ast);
      return ast;
    } catch (e) {
      const err: ParseError = {
        line: 1,
        column: 1,
        message: typeof e === 'string' ? e : (e instanceof Error ? e.message : String(e)),
        severity: 'error',
      };
      setParseError(err);
      throw e;
    }
  }, []);

  const validate = useCallback(async (source: string): Promise<void> => {
    setParseError(null);
    try {
      const messages = await invoke<string[]>('validate_dz', { source });
      const validationIssues: ValidationIssue[] = messages.map(m => ({
        ruleId: 0,
        message: m,
        severity: 'warning' as const,
      }));
      setIssues(validationIssues);
    } catch (e) {
      const err: ParseError = {
        line: 1,
        column: 1,
        message: typeof e === 'string' ? e : (e instanceof Error ? e.message : String(e)),
        severity: 'error',
      };
      setParseError(err);
    }
  }, []);

  return { parse, validate, parseResult, issues, parseError };
}
