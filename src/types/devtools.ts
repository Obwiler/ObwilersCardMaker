/** devtools 类型定义 — 与 Rust crate 保持一致 */

export interface CheckResult {
  name: string;
  passed: boolean;
  duration_ms: number;
  stdout: string;
  stderr: string;
  exit_code: number | null;
}

export interface HealthReport {
  total: number;
  passed: number;
  failed: number;
  checks: CheckResult[];
  summary: string;
}

export interface ErrorEntry {
  check: string;
  unix_secs: number;
  stderr_snippet: string;
  exit_code: number | null;
}
