/**
 * 数据治理模块前端类型定义
 * 与 Rust 后端 src-tauri/crates/parser/src/data_gov.rs 结构严格对齐
 */

export interface JsonValidationError {
  card_id: string;
  card_name: string;
  field: string;
  message: string;
}

export interface JsonValidationResult {
  valid: boolean;
  total_cards: number;
  errors: JsonValidationError[];
}

export interface DuplicatePair {
  card_a_id: string;
  card_a_name: string;
  card_b_id: string;
  card_b_name: string;
  reason: string; // "name" | "text_hash" | "both"
}

export interface ImportResult {
  imported: number;
  skipped: number;
  skipped_details: string[];
  total_after: number;
}
