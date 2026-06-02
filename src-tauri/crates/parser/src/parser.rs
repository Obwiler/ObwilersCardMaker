//! 语法分析器 - 将 Token 流解析为 AST
//!
//! AST 节点：
//! - CardAst: 卡牌名、标签、五段式条目、标签定义块
//! - CardEntry: 单个五段式（条件/主/谓/宾/备注）
//! - TagDef: 标签定义块（含 A/B/C 编号的子条目）

use crate::lexer::{Token, tokenize};
use serde::{Deserialize, Serialize};

// ============ AST 节点 ============

/// 单个五段式条目（统一类型，来自 core）
pub use core::FiveStageEntry as CardEntry;

/// 标签定义块中的子条目（与 CardEntry 字段一致，统一为 FiveStageEntry）
pub use core::FiveStageEntry as TagEntry;

/// 标签定义块
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TagDef {
    pub tag_name: String,
    pub entries: Vec<TagEntry>,
}

/// 卡牌 AST
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CardAst {
    pub name: String,
    pub list_tags: Vec<String>,    // 所属标签（阵营/职业/构筑类型等）
    pub pre_tag: Vec<String>,      // 段前标签（上限、类型、互斥等）
    pub duel_tags: Vec<String>,    // 对峙标签
    pub entries: Vec<CardEntry>,   // 五段式主条目
    pub tag_defs: Vec<TagDef>,     // 标签定义块
}

/// 解析错误
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ParseError {
    pub line: usize,
    pub message: String,
}

/// 解析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    pub card_name: String,
    pub ast: Option<CardAst>,
    pub errors: Vec<ParseError>,
}

impl ParseResult {
    pub fn success(name: &str, ast: CardAst) -> Self {
        ParseResult { card_name: name.to_string(), ast: Some(ast), errors: vec![] }
    }
    pub fn failure(name: &str, errors: Vec<ParseError>) -> Self {
        ParseResult { card_name: name.to_string(), ast: None, errors }
    }
}

// ============ 解析器 ============

/// 将 Token 流按 Arrow 分割为五段
fn split_by_arrow(tokens: &[Token]) -> Vec<Vec<Token>> {
    let mut segments: Vec<Vec<Token>> = vec![];
    let mut current: Vec<Token> = vec![];

    for token in tokens {
        match token {
            Token::Arrow => {
                segments.push(std::mem::take(&mut current));
            }
            _ => current.push(token.clone()),
        }
    }
    segments.push(current);
    segments
}

/// 将 Token 段转为纯文本字符串
fn segment_to_text(tokens: &[Token]) -> String {
    let mut s = String::new();
    for t in tokens {
        match t {
            Token::Text(txt) | Token::Number(txt) => {
                s.push_str(txt);
            }
            Token::Dash => s.push('—'),
            Token::Colon => s.push('：'),
            Token::Comma => s.push('，'),
            Token::LParen => s.push('（'),
            Token::RParen => s.push('）'),
            Token::LBook => s.push('《'),
            Token::RBook => s.push('》'),
            Token::LBracket => s.push('['),
            Token::RBracket => s.push(']'),
            Token::Plus => s.push('+'),
            Token::Times => s.push('×'),
            Token::Equals => s.push('='),
            Token::Gt => s.push('>'),
            Token::Lt => s.push('<'),
            Token::Hash => s.push('#'),
            Token::Pipe => s.push('|'),
            _ => {}
        }
    }
    s.trim().to_string()
}

/// 判断文本是否是标签引用 "[TagName]"
#[allow(dead_code)]
fn parse_tag_ref(text: &str) -> Option<String> {
    let text = text.trim();
    if text.starts_with('[') && text.ends_with(']') && !text.contains('|') {
        let inner = &text[1..text.len()-1];
        if !inner.contains(':') && !inner.contains('：') && !inner.is_empty() {
            return Some(inner.to_string());
        }
    }
    None
}

/// 判断文本是否是标签定义起始 "[TagName]定义："
fn parse_tag_def_start(text: &str) -> Option<String> {
    let text = text.trim();
    if text.starts_with('[') && text.contains(']') {
        if let Some(end_bracket) = text.find(']') {
            let tag_name = &text[1..end_bracket];
            let after = &text[end_bracket+1..];
            let after = after.trim();
            if after.starts_with("定义：") || after.starts_with("定义:") {
                return Some(tag_name.to_string());
            }
        }
    }
    None
}

/// 解析表格行（| A | cond | subj | pred | obj | note |）
fn parse_table_row(line: &str) -> Option<TagEntry> {
    let line = line.trim();
    if !line.starts_with('|') { return None; }

    let cells: Vec<&str> = line.split('|').map(|s| s.trim()).collect();
    // cells[0] 为空, cells[1..] 为内容
    if cells.len() < 6 { return None; }

    let id = cells[1].to_string();
    // 跳过标题行
    if id == "#" || id == "编号" || id.is_empty() || id == "-" { return None; }

    Some(TagEntry {
        id,
        condition: cells.get(2).unwrap_or(&"").to_string(),
        subject: cells.get(3).unwrap_or(&"").to_string(),
        predicate: cells.get(4).unwrap_or(&"").to_string(),
        object: cells.get(5).unwrap_or(&"").to_string(),
        note: cells.get(6).unwrap_or(&"").to_string(),
    })
}

/// 主解析函数：将卡牌文本解析为 CardAst
pub fn parse_card_text(name: &str, text: &str) -> ParseResult {
    let mut errors: Vec<ParseError> = vec![];
    let mut entries: Vec<CardEntry> = vec![];
    let mut tag_defs: Vec<TagDef> = vec![];
    let mut current_tag_def: Option<TagDef> = None;

    let mut list_tags: Vec<String> = vec![];
    let mut pre_tag: Vec<String> = vec![];
    let mut duel_tags: Vec<String> = vec![];

    let lines: Vec<&str> = text.lines().collect();

    for (line_idx, raw_line) in lines.iter().enumerate() {
        let line = raw_line.trim();
        let _line_no = line_idx + 1;

        if line.is_empty() { continue; }

        // 跳过 Markdown 标题行
        if line.starts_with('#') || line.starts_with("---") {
            // 提取标签信息
            if line.contains("阵营") { list_tags.push("阵营".to_string()); }
            if line.contains("职业") { list_tags.push("职业".to_string()); }
            if line.contains("兵刃") { list_tags.push("兵刃".to_string()); }
            if line.contains("宝器") { list_tags.push("宝器".to_string()); }
            if line.contains("甲胄") { list_tags.push("甲胄".to_string()); }
            if line.contains("武学") { list_tags.push("武学".to_string()); }
            if line.contains("术法") { list_tags.push("术法".to_string()); }
            if line.contains("基本牌") { list_tags.push("基本牌".to_string()); }
            continue;
        }

        // 检查是否是标签定义起始
        if let Some(tag_name) = parse_tag_def_start(line) {
            // 保存之前的标签定义块
            if let Some(td) = current_tag_def.take() {
                tag_defs.push(td);
            }
            current_tag_def = Some(TagDef { tag_name, entries: vec![] });
            continue;
        }

        // 如果在标签定义块中，解析表格行
        if current_tag_def.is_some() {
            if line.starts_with('|') {
                if let Some(entry) = parse_table_row(line) {
                    current_tag_def.as_mut().unwrap().entries.push(entry);
                }
                continue;
            }
            // 结束当前标签定义块
            if let Some(td) = current_tag_def.take() {
                if !td.entries.is_empty() {
                    tag_defs.push(td);
                }
            }
        }

        // 尝试解析五段式行
        let tokens = tokenize(line);
        // 过滤掉 Newline/BlankLine/Pipe
        let filtered: Vec<Token> = tokens.into_iter()
            .filter(|t| !matches!(t, Token::Newline | Token::BlankLine))
            .collect();

        let segments = split_by_arrow(&filtered);

        if segments.len() >= 5 {
            // 提取 id
            let id_segment = if segments.len() > 5 {
                segment_to_text(&segments[0])
            } else {
                String::new()
            };

            let offset = if segments.len() > 5 { 1 } else { 0 };
            let condition = segment_to_text(&segments[offset]);
            let subject = segment_to_text(&segments.get(offset + 1).unwrap_or(&vec![]));
            let predicate = segment_to_text(&segments.get(offset + 2).unwrap_or(&vec![]));
            let object = segment_to_text(&segments.get(offset + 3).unwrap_or(&vec![]));
            let note = segment_to_text(&segments.get(offset + 4).unwrap_or(&vec![]));

            if !condition.is_empty() || !subject.is_empty() || !predicate.is_empty() {
                let entry_id = if id_segment.is_empty() {
                    format!("{}", entries.len() + 1)
                } else {
                    id_segment
                };
                entries.push(CardEntry {
                    id: entry_id,
                    condition,
                    subject,
                    predicate,
                    object,
                    note,
                });
            }
        } else if segments.len() >= 1 {
            let first = segment_to_text(&segments[0]);
            // 检测元数据行
            if first.starts_with("上限") || first.starts_with("消耗") || first.starts_with("类型") || first.starts_with("互斥") {
                let meta_line = line.to_string();
                if meta_line.contains("上限") { pre_tag.push(meta_line.clone()); }
                if meta_line.contains("互斥") { pre_tag.push(meta_line.clone()); }
                continue;
            }

            // 也可能是单段式效果（如某些标签定义块内行）
            // 或者属性行（生命/护甲/技力）
            if first.contains("生命") || first.contains("护甲") || first.contains("技力") || first.contains("属性") {
                continue;
            }

            // 非五段式也非元数据 — 可能是纯文本定义行
            // 作为不带条件的条目处理
            if !first.is_empty() && first.len() > 2 && !first.starts_with("**") && !first.starts_with(">") {
                // 可能是内联标签定义（如 | — | 自身 | 消耗 | 1张紫卡 | — |）
                if line.starts_with('|') {
                    if let Some(entry) = parse_table_row(line) {
                        entries.push(CardEntry {
                            id: entry.id.clone(),
                            condition: entry.condition,
                            subject: entry.subject,
                            predicate: entry.predicate,
                            object: entry.object,
                            note: entry.note,
                        });
                    }
                }
            }
        }
    }

    // 处理最后未关闭的标签定义块
    if let Some(td) = current_tag_def.take() {
        if !td.entries.is_empty() {
            tag_defs.push(td);
        }
    }

    // 从 tag_defs 中收集 duel_tags
    for td in &tag_defs {
        duel_tags.push(td.tag_name.clone());
    }

    if entries.is_empty() && tag_defs.is_empty() {
        errors.push(ParseError { line: 0, message: "未能解析出任何五段式条目或标签定义块".to_string() });
        return ParseResult::failure(name, errors);
    }

    let ast = CardAst {
        name: name.to_string(),
        list_tags,
        pre_tag,
        duel_tags,
        entries,
        tag_defs,
    };

    ParseResult::success(name, ast)
}

/// 便捷函数：解析简单的单行五段式
#[allow(dead_code)]
pub fn parse_single_line(line: &str) -> Option<CardEntry> {
    let tokens = tokenize(line);
    let filtered: Vec<Token> = tokens.into_iter()
        .filter(|t| !matches!(t, Token::Newline | Token::BlankLine))
        .collect();
    let segments = split_by_arrow(&filtered);
    if segments.len() >= 5 {
        Some(CardEntry {
            id: "1".to_string(),
            condition: segment_to_text(&segments[0]),
            subject: segment_to_text(&segments[1]),
            predicate: segment_to_text(&segments[2]),
            object: segment_to_text(&segments[3]),
            note: segment_to_text(&segments[4]),
        })
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_line() {
        let entry = parse_single_line("消耗1点技力 → 自身 → 造成 → 目标1点物理伤害 → 每回合限1次").unwrap();
        assert_eq!(entry.condition, "消耗1点技力");
        assert_eq!(entry.subject, "自身");
        assert_eq!(entry.predicate, "造成");
        assert_eq!(entry.object, "目标1点物理伤害");
        assert_eq!(entry.note, "每回合限1次");
    }

    #[test]
    fn test_parse_with_dash() {
        let entry = parse_single_line("— → 自身 → 恢复 → 1点生命 → —").unwrap();
        assert_eq!(entry.condition, "—");
        assert_eq!(entry.subject, "自身");
        assert_eq!(entry.predicate, "恢复");
        assert_eq!(entry.object, "1点生命");
        assert_eq!(entry.note, "—");
    }

    #[test]
    fn test_parse_tag_ref() {
        let line = "攻击时 → 自身 → 执行 → [一槌定音] → —";
        let entry = parse_single_line(line).unwrap();
        assert_eq!(entry.predicate, "执行");
        assert_eq!(entry.object, "[一槌定音]");
    }

    #[test]
    fn test_parse_tag_def_start() {
        assert_eq!(parse_tag_def_start("[韬光养晦]定义："), Some("韬光养晦".to_string()));
        assert_eq!(parse_tag_def_start("普通文本"), None);
    }

    #[test]
    fn test_parse_table_row() {
        let row = "| A | — | 自身 | 消耗 | 1张紫卡 | — |";
        let entry = parse_table_row(row).unwrap();
        assert_eq!(entry.id, "A");
        assert_eq!(entry.condition, "—");
        assert_eq!(entry.subject, "自身");
        assert_eq!(entry.predicate, "消耗");
        assert_eq!(entry.object, "1张紫卡");
        assert_eq!(entry.note, "—");
    }

    // ============ 完整 parse_card_text 测试 ============

    #[test]
    fn test_parse_complete_card() {
        let text = "\
消耗1「仁心」 → 自身 → 恢复 → 1点技力 → —\n\
消耗1「仁心」 → 自身 → 抽取 → 1张牌 → —\n\
触发#4后 → 自身 → 恢复 → 1点生命 → —";
        let result = parse_card_text("儒家", text);
        assert!(result.ast.is_some());
        let ast = result.ast.unwrap();
        assert_eq!(ast.name, "儒家");
        assert_eq!(ast.entries.len(), 3);
        assert_eq!(ast.entries[0].condition, "消耗1「仁心」");
        assert_eq!(ast.entries[0].predicate, "恢复");
        assert_eq!(ast.entries[1].predicate, "抽取");
        assert_eq!(ast.entries[2].predicate, "恢复");
    }

    #[test]
    fn test_parse_card_with_tag_def() {
        let text = "\
使用 → 自身 → 执行 → [谋定后动] → —\n\
[谋定后动]定义：\n\
| A | 选择伤害 | 自身 | 增加 | 下次伤害+1 | 效果不可叠加 |\n\
| B | 选择治疗 | 自身 | 增加 | 下次治疗+1 | 效果不可叠加 |";
        let result = parse_card_text("蓄势", text);
        assert!(result.ast.is_some());
        let ast = result.ast.unwrap();
        assert_eq!(ast.entries.len(), 1);
        assert_eq!(ast.tag_defs.len(), 1);
        assert_eq!(ast.tag_defs[0].tag_name, "谋定后动");
        assert_eq!(ast.tag_defs[0].entries.len(), 2);
        assert!(ast.duel_tags.contains(&"谋定后动".to_string()));
    }

    #[test]
    fn test_parse_empty_input() {
        let result = parse_card_text("空卡", "");
        assert!(result.ast.is_none());
        assert!(!result.errors.is_empty());
        assert!(result.errors[0].message.contains("未能解析"));
    }

    #[test]
    fn test_parse_only_name_no_entries() {
        let result = parse_card_text("仅名称", "这是一段没有箭头的纯文本描述。");
        assert!(result.ast.is_none());
    }

    #[test]
    fn test_parse_unicode_arrows() {
        let text = "条件A → 主语A → 谓语A → 宾语A → 备注A";
        let result = parse_card_text("Unicode箭头", text);
        assert!(result.ast.is_some());
        let ast = result.ast.unwrap();
        assert_eq!(ast.entries.len(), 1);
        assert_eq!(ast.entries[0].condition, "条件A");
    }

    #[test]
    fn test_parse_special_unicode() {
        let text = "🎯消耗 → 自身 → 执行 → テスト → —";
        let result = parse_card_text("特殊Unicode", text);
        assert!(result.ast.is_some());
        let ast = result.ast.unwrap();
        assert_eq!(ast.entries[0].condition, "🎯消耗");
        assert_eq!(ast.entries[0].object, "テスト");
    }

    #[test]
    fn test_parse_max_length() {
        let long_condition = "条件".repeat(100);
        let text = format!("{} → 自身 → 造成 → 目标1点伤害 → —", long_condition);
        let result = parse_card_text("超长", &text);
        assert!(result.ast.is_some());
        assert_eq!(result.ast.unwrap().entries[0].condition.len(), 300);
    }

    #[test]
    fn test_parse_single_segment_only() {
        let text = "生命8，护甲2，技力4";
        let result = parse_card_text("属性", text);
        // 属性行被跳过，不应有 AST
        assert!(result.ast.is_none());
    }

    #[test]
    fn test_parse_mixed_valid_invalid() {
        let text = "\
消耗1技力 → 自身 → 造成 → 目标1点伤害 → —\n\
这是一行无效文本\n\
攻击时 → 自身 → 执行 → [一槌定音] → —";
        let result = parse_card_text("混合", text);
        assert!(result.ast.is_some());
        let ast = result.ast.unwrap();
        // 至少 2 个有效条目
        assert!(ast.entries.len() >= 2);
    }

    #[test]
    fn test_parse_tag_def_multi_block() {
        let text = "\
使用 → 自身 → 执行 → [韬光养晦] → —\n\
[韬光养晦]定义：\n\
| A | — | 自身 | 消耗 | 1张紫卡 | — |\n\
[一槌定音]定义：\n\
| A | — | 自身 | 翻牌堆顶 | 判定牌 | — |";
        let result = parse_card_text("多标签", text);
        assert!(result.ast.is_some());
        let ast = result.ast.unwrap();
        assert_eq!(ast.tag_defs.len(), 2);
        assert_eq!(ast.duel_tags.len(), 2);
    }

    #[test]
    fn test_parse_metadata_line_skipped() {
        let text = "\
上限3 → — → — → — → —\n\
消耗1技力 → 自身 → 造成 → 1点伤害 → —";
        let result = parse_card_text("元数据", text);
        assert!(result.ast.is_some());
        let ast = result.ast.unwrap();
        // 上限行被跳过
        assert_eq!(ast.entries.len(), 1);
    }

    #[test]
    fn test_split_by_arrow_fewer_segments() {
        let tokens = crate::lexer::tokenize("只有一段");
        let filtered: Vec<crate::lexer::Token> = tokens.into_iter()
            .filter(|t| !matches!(t, crate::lexer::Token::Newline | crate::lexer::Token::BlankLine))
            .collect();
        let segments = split_by_arrow(&filtered);
        assert_eq!(segments.len(), 1);
    }

    #[test]
    fn test_segment_to_text_all_tokens() {
        use crate::lexer::{Token, tokenize};
        let tokens = tokenize("消耗1→自身→造成→目标1点伤害→备注");
        let filtered: Vec<Token> = tokens.into_iter()
            .filter(|t| !matches!(t, Token::Newline | Token::BlankLine))
            .collect();
        let segments = split_by_arrow(&filtered);
        assert_eq!(segments.len(), 5);
        let text = segment_to_text(&segments[0]);
        assert_eq!(text, "消耗1");
    }
}
