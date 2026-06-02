//! DZ 语法解析器（完整版）
//!
//! 行级递归下降解析。DZ 的核心结构是缩进层级 + 行首标记符号。
//!
//! 解析流程：
//!   source → Vec<Line> → CardAst(JsonValue)
//!
//! 卡牌结构：
//!   name [type, attrs]              ← 声明行
//!     核心技能：skill_name           ← 核心技能（阵营卡）
//!       效果行...                    ← 缩进 4 空格
//!     效果行...                      ← 缩进 2 空格（普通效果）
//!     效果行...
//!     ？分支描述...                  ← 分支效果
//!       效果行...                    ← 缩进分支子效果
//!     ·选项描述...                   ← 多选一
//!     —常驻效果...                   ← 常驻被动
//!     效果行 [备注]                  ← 行尾备注约束
//!     效果中带「标记」               ← 标记引用

use super::lexer::Line;
use dz_cardmaker_ports::ParseError;
use serde_json::{json, Value as Json};

pub fn parse_lines(lines: &[Line]) -> Result<Json, ParseError> {
    if lines.is_empty() {
        return Err(ParseError { line: 1, col: 0, message: "空文本".into(), severity: dz_cardmaker_ports::IssueSeverity::Error });
    }

    let mut pos = 0;
    parse_card(lines, &mut pos, 0)
}

fn parse_card(lines: &[Line], pos: &mut usize, min_indent: usize) -> Result<Json, ParseError> {
    // --- 卡牌声明行 ---
    let (name, category, attrs) = parse_header(&lines[*pos])?;
    *pos += 1;

    // --- 效果块 ---
    let mut effects = Vec::new();
    while *pos < lines.len() && lines[*pos].indent >= min_indent {
        let block = parse_effect_block(lines, pos, min_indent)?;
        effects.push(block);
    }

    Ok(json!({
        "name": name,
        "category": category,
        "attributes": attrs,
        "effects": effects
    }))
}

// ============================================================================
// 卡牌头解析
// ============================================================================

fn parse_header(line: &Line) -> Result<(String, String, Json), ParseError> {
    let text = line.text.trim_end_matches('。').trim_end_matches('，').to_string();

    match text.find('[') {
        Some(bracket_start) => {
            let name = text[..bracket_start].trim().to_string();
            let bracket_end = text.rfind(']').unwrap_or(text.len());
            let inner = &text[bracket_start + 1..bracket_end];
            let parts: Vec<&str> = inner.split(',').map(|s| s.trim()).collect();

            let category = parts.first().copied().unwrap_or("").to_string();
            let mut attrs = json!({});

            for part in &parts[1..] {
                let kv: Vec<&str> = part.splitn(2, ':').collect();
                if kv.len() == 2 {
                    let val = kv[1].trim();
                    attrs[kv[0].trim()] = parse_attr_value(val);
                } else {
                    // Handle "生命8" → attrs["生命"] = 8
                    if let Some(split) = find_digit_split(part) {
                        let (key, val_str) = part.split_at(split);
                        let key = key.trim();
                        let val_str = val_str.trim();
                        attrs[key] = parse_attr_value(val_str);
                    } else {
                        attrs[part.trim()] = json!(true);
                    }
                }
            }

            if name.is_empty() {
                Err(ParseError { line: line.line_no, col: 0, message: "卡牌缺少名称".into(), severity: dz_cardmaker_ports::IssueSeverity::Error })
            } else {
                Ok((name, category, attrs))
            }
        }
        None => {
            Err(ParseError { line: line.line_no, col: 0, message: "缺少类型声明 [...]".into(), severity: dz_cardmaker_ports::IssueSeverity::Error })
        }
    }
}

// ============================================================================
// 效果块解析
// ============================================================================

fn parse_effect_block(lines: &[Line], pos: &mut usize, min_indent: usize) -> Result<Json, ParseError> {
    let line = &lines[*pos];

    // 核心技能声明
    if line.text.starts_with("核心技能") {
        *pos += 1;
        let skill_name = line.text.replace("核心技能：", "").replace("核心技能:", "").trim().to_string();
        let entries = parse_entries(lines, pos, min_indent + 4)?;
        return Ok(json!({
            "type": "core_skill",
            "skill_name": skill_name,
            "entries": entries
        }));
    }

    // 多选一区块头（如 "点石成金："）
    if line.text.ends_with('：') && !line.text.contains('[')
        && !line.text.starts_with('？') && !line.text.starts_with('·') && !line.text.starts_with('—') {
        *pos += 1;
        let block_name = line.text.trim_end_matches('：').to_string();
        let mut options = Vec::new();
        while *pos < lines.len() && lines[*pos].indent > min_indent {
            if lines[*pos].text.starts_with('·') {
                *pos += 1;
                let text = lines[*pos - 1].text.replacen('·', "", 1).trim().to_string();
                let entry = parse_effect_line_content(&text, &lines[*pos - 1]);
                options.push(entry);
            } else {
                break;
            }
        }
        return Ok(json!({
            "type": "multi_option",
            "block_name": block_name,
            "options": options
        }));
    }

    // 条件触发块
    if is_trigger_line(&line.text) {
        *pos += 1;
        let trigger = line.text.trim_end_matches('，').trim_end_matches('。').to_string();
        let entries = parse_entries(lines, pos, min_indent + 2)?;
        return Ok(json!({
            "type": "trigger_block",
            "trigger": trigger,
            "entries": entries
        }));
    }

    // 默认块（无触发条件的效果集合）
    let entries = parse_entries(lines, pos, min_indent)?;
    Ok(json!({
        "type": "default_block",
        "entries": entries
    }))
}

// ============================================================================
// 条目解析
// ============================================================================

fn parse_entries(lines: &[Line], pos: &mut usize, block_indent: usize) -> Result<Vec<Json>, ParseError> {
    let mut entries = Vec::new();

    while *pos < lines.len() && lines[*pos].indent >= block_indent {
        let line = &lines[*pos];

        // 分支（？）
        if line.text.starts_with('？') {
            *pos += 1;
            let cond = line.text.replacen('？', "", 1).trim().trim_end_matches('。').to_string();
            let sub_entries = parse_entries(lines, pos, block_indent + 2)?;
            entries.push(json!({
                "type": "branch",
                "condition": cond,
                "entries": sub_entries
            }));
            continue;
        }

        // 选项（·）
        if line.text.starts_with('·') {
            *pos += 1;
            let text = line.text.replacen('·', "", 1).trim().to_string();
            entries.push(parse_effect_line_content(&text, line));
            continue;
        }

        // 常驻（—）
        if line.text.starts_with('—') {
            *pos += 1;
            let text = line.text.replacen('—', "", 1).trim().to_string();
            let mut entry = parse_effect_line_content(&text, line);
            entry["type"] = json!("constant");
            entries.push(entry);
            continue;
        }

        // 多选一区块头（在段落内，如 "点石成金："）
        if line.text.ends_with('：') && !line.text.contains('[')
            && !line.text.starts_with('？') && !line.text.starts_with('·') && !line.text.starts_with('—') {
            *pos += 1;
            let block_name = line.text.trim_end_matches('：').to_string();
            let mut options = Vec::new();
            while *pos < lines.len() && lines[*pos].indent > block_indent {
                if lines[*pos].text.starts_with('·') {
                    *pos += 1;
                    let text = lines[*pos - 1].text.replacen('·', "", 1).trim().to_string();
                    let entry = parse_effect_line_content(&text, &lines[*pos - 1]);
                    options.push(entry);
                } else {
                    break;
                }
            }
            entries.push(json!({
                "type": "multi_option",
                "block_name": block_name,
                "options": options
            }));
            continue;
        }

        // 子触发条件（段落内条件行，如"核心技能：仁怀"下的效果有独立条件）
        if is_trigger_line(&line.text) {
            *pos += 1;
            let trigger = line.text.trim_end_matches('，').trim_end_matches('。').to_string();
            let sub = parse_entries(lines, pos, block_indent + 2)?;
            entries.push(json!({
                "type": "trigger_block",
                "trigger": trigger,
                "entries": sub
            }));
            continue;
        }

        // 普通效果行
        *pos += 1;
        entries.push(parse_effect_line_content(&line.text, line));
    }

    Ok(entries)
}

// ============================================================================
// 效果行内容解析
// ============================================================================

fn parse_effect_line_content(text: &str, line: &Line) -> Json {
    let clean = text.trim().trim_end_matches('。').to_string();

    // 提取备注 [...]
    let (main_text, remark) = match clean.rfind('[') {
        Some(pos) if pos < clean.rfind(']').unwrap_or(pos) => {
            let remark = clean[pos..].to_string();
            let main = clean[..pos].trim().to_string();
            (main, Some(remark))
        }
        _ => (clean, None),
    };

    // 提取标记引用 「...」
    let mut mark_refs = Vec::new();
    let mut i = 0;
    let chars: Vec<char> = main_text.chars().collect();
    while i < chars.len() {
        if chars[i] == '「' {
            let start = i + 1;
            i += 1;
            while i < chars.len() && chars[i] != '」' {
                i += 1;
            }
            if start < i {
                let ref_name: String = chars[start..i].iter().collect();
                mark_refs.push(format!("「{}」", ref_name));
            }
        }
        i += 1;
    }

    // 提取主语
    let subjects = [
        "对目标", "对1单位", "对伤害来源", "对攻击者",
        "攻击者", "伤害来源", "目标", "其他玩家", "其他单位",
    ];
    let mut subject = None;
    let mut rest = main_text.as_str();

    for subj in &subjects {
        if rest.starts_with(subj) {
            rest = rest[subj.len()..].trim();
            subject = Some(subj.to_string());
            break;
        }
    }

    json!({
        "type": "simple",
        "subject": subject,
        "text": rest,
        "remark": remark,
        "mark_refs": mark_refs,
        "line": line.line_no
    })
}

// ============================================================================
// 辅助函数
// ============================================================================

fn is_trigger_line(text: &str) -> bool {
    let t = text.trim();
    // Standalone trigger line: ends with "时，" or "时。"
    // Inline triggers like "获得...时，积累..." are NOT standalone
    t.ends_with("时，") || t.ends_with("时。")
}

/// Find the split point between CJK text and digits (e.g., "生命8" → split before "8")
fn find_digit_split(s: &str) -> Option<usize> {
    let mut cjk_end: Option<usize> = None;
    for (byte_pos, c) in s.char_indices() {
        if c.is_ascii_digit() {
            return cjk_end;
        }
        cjk_end = Some(byte_pos + c.len_utf8());
    }
    None
}

/// Parse an attribute value: numbers, booleans, or strings
fn parse_attr_value(val: &str) -> Json {
    if let Ok(n) = val.parse::<i64>() {
        return json!(n);
    }
    match val.to_lowercase().as_str() {
        "true" => json!(true),
        "false" => json!(false),
        _ => json!(val),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::lexer;

    #[test]
    fn test_parse_basic_card() {
        let src = "击敌 [基本牌, 白]\n  对目标造成1点物理伤害。";
        let (lines, _) = lexer::tokenize(src);
        let result = parse_lines(&lines).unwrap();
        assert_eq!(result["name"], "击敌");
        assert_eq!(result["category"], "基本牌");
        assert_eq!(result["attributes"]["白"], true);
        assert_eq!(result["effects"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn test_parse_faction_card() {
        let src = r#"儒家 [阵营, 生命8, 护甲2, 技力4]

  核心技能：仁怀

    获得白或紫基本牌时，积累1个「仁心」标记[每回合最多3个]。

    消耗1个「仁心」，恢复1点技力。"#;
        let (lines, _) = lexer::tokenize(src);
        let result = parse_lines(&lines).unwrap();
        assert_eq!(result["name"], "儒家");
        assert_eq!(result["category"], "阵营");
        assert_eq!(result["attributes"]["生命"], 8);
        let effects = result["effects"].as_array().unwrap();
        assert_eq!(effects.len(), 1);
        let core = &effects[0];
        assert_eq!(core["type"], "core_skill");
        assert_eq!(core["skill_name"], "仁怀");
        assert!(core["entries"].as_array().unwrap().len() >= 2);
    }

    #[test]
    fn test_parse_branch_effects() {
        let src = r#"指虎 [兵刃]
  攻击时，翻牌堆顶1张判定牌。
  ？判定牌不是蓝也不是白。本次物理伤害翻倍。
  ？判定牌是蓝或白。获得这张判定牌。"#;
        let (lines, _) = lexer::tokenize(src);
        let result = parse_lines(&lines).unwrap();
        assert_eq!(result["name"], "指虎");
        let effects = result["effects"].as_array().unwrap();
        assert!(effects.len() >= 1);
        let block = &effects[0];
        let entries = block["entries"].as_array().unwrap();
        // should have: simple, branch, branch
        assert!(entries.len() >= 2);
        assert!(entries.iter().any(|e| e["type"] == "branch"));
    }

    #[test]
    fn test_parse_multi_option() {
        let src = r#"药师 [职业]
  回合开始时，获得1个「材料」标记[上限4个]。

  点石成金：
    ·消耗1个「材料」并弃1张手牌，获得1点护甲[每配方每回合1次]。
    ·消耗1个「材料」并消耗1点生命，获得2点技力[每配方每回合1次]。"#;
        let (lines, _) = lexer::tokenize(src);
        let result = parse_lines(&lines).unwrap();
        assert_eq!(result["name"], "药师");
        assert_eq!(result["category"], "职业");
        let effects = result["effects"].as_array().unwrap();
        // Both effects are inside a default_block's entries
        assert!(effects.len() >= 1);
        let block = &effects[0];
        let entries = block["entries"].as_array().unwrap();
        let multi = entries.iter().find(|e| e["type"] == "multi_option");
        assert!(multi.is_some(), "Should find a multi_option block in entries");
        let opts = multi.unwrap()["options"].as_array().unwrap();
        assert_eq!(opts.len(), 2);
    }

    #[test]
    fn test_full_card_roundtrip() {
        let src = r#"浮光 [武学, 被动]
  受到伤害时，消耗1张紫卡，将本卡效果视为「免疫本次伤害」。
  规避成功后，抽取1张基本牌。"#;
        let (lines, _) = lexer::tokenize(src);
        let result = parse_lines(&lines).unwrap();
        assert_eq!(result["name"], "浮光");
        assert_eq!(result["category"], "武学");
        assert_eq!(result["attributes"]["被动"], true);
        let effects = result["effects"].as_array().unwrap();
        assert!(effects.len() >= 1);
        let block = &effects[0];
        assert!(block["entries"].as_array().unwrap().len() >= 2);
    }
}
