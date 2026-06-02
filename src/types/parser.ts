// Parser 模块前端类型定义
// 与 Rust 后端 src-tauri/crates/parser/ 结构严格对齐

export interface CardEntry {
  id: string;
  condition: string;
  subject: string;
  predicate: string;
  object: string;
  note: string;
}

export interface TagEntry {
  id: string;
  condition: string;
  subject: string;
  predicate: string;
  object: string;
  note: string;
}

export interface TagDef {
  tag_name: string;
  entries: TagEntry[];
}

export interface CardAst {
  name: string;
  list_tags: string[];
  pre_tag: string[];
  duel_tags: string[];
  entries: CardEntry[];
  tag_defs: TagDef[];
}

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  card_name: string;
  ast: CardAst | null;
  errors: ParseError[];
}

export interface Card {
  id: string;
  name: string;
  list_tags: string[];
  pre_tag: string[];
  duel_tags: string[];
  text: string;
  ast: CardAst | null;
  errors: string[];
  created_at: string;
  modified_at: string;
}

export interface ValidationError {
  card_name: string;
  line: number;
  description: string;
}

export interface CardValidation {
  card_name: string;
  has_ast: boolean;
  entry_count: number;
  tag_def_count: number;
  errors: ValidationError[];
  warnings: string[];
}

export interface ParseStats {
  total: number;
  parsed: number;
  failed: number;
}