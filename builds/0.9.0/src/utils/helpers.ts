import { ComparisonOperator } from "@/atomic";

/**
 * 生成唯一 ID
 */
function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rand}`;
}

/**
 * 深度克隆对象
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * 比较两个数值
 */
function compareValues(
  a: number,
  operator: ComparisonOperator,
  b: number
): boolean {
  switch (operator) {
    case ComparisonOperator.LT: return a < b;
    case ComparisonOperator.LTE: return a <= b;
    case ComparisonOperator.EQ: return a === b;
    case ComparisonOperator.GTE: return a >= b;
    case ComparisonOperator.GT: return a > b;
    case ComparisonOperator.NEQ: return a !== b;
    case ComparisonOperator.UNKNOWN: return true;
    default: return false;
  }
}

/**
 * 格式化 Unix 时间戳
 */
function formatTimestamp(ts: number): string {
  const dt = new Date(ts);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

export { generateId, deepClone, compareValues, formatTimestamp };
