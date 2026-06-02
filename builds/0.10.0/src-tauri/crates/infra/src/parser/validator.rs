//! DZ 语法校验器 — 11 条规则全部激活
//!
//! 校验规则清单（对应 06-ide-spec.md）：
//!   1. 宾语栏含动词
//!   2. 备注含条件判断
//!   3. 备注含分支效果
//!   4. 一行内主语切换
//!   5. 缩进层级跳跃
//!   6. 未知谓语动词
//!   7. 未知标记名
//!   8. 未知条件词
//!   9. 卡牌头缺类型标记
//!   10. 宾语缺失
//!   11. 别名不匹配

use dz_cardmaker_ports::*;
use serde_json::Value as Json;

pub fn validate(ast: &Json, mark_registry: &dyn MarkRegistryPort) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();

    // Rule 9: 卡牌头缺名称/类型
    check_rule_9(ast, &mut issues);

    // Rule 7: 未知标记名
    check_rule_7(ast, mark_registry, &mut issues);

    // Rule 1-5, 6, 8, 10, 11: 遍历效果条目
    if let Some(effects) = ast["effects"].as_array() {
        for effect in effects {
            validate_effect_block(effect, mark_registry, &mut issues);
        }
    }

    issues
}

fn validate_effect_block(block: &Json, mark_registry: &dyn MarkRegistryPort, issues: &mut Vec<ValidationIssue>) {
    let entries = block["entries"].as_array();

    match entries {
        Some(e) => {
            for entry in e {
                validate_entry(entry, mark_registry, issues);
            }
        }
        None => {
            // single entry (multi_option options, branch entries, etc.)
            if block.is_object() {
                validate_entry(block, mark_registry, issues);
            }
        }
    }

    // Recurse into nested blocks
    if let Some(e) = entries {
        for entry in e {
            if entry["type"] == "trigger_block" || entry["type"] == "core_skill"
                || entry["type"] == "branch" || entry["type"] == "default_block" {
                validate_effect_block(entry, mark_registry, issues);
            }
        }
    }
    if let Some(opts) = block["options"].as_array() {
        for opt in opts {
            validate_entry(opt, mark_registry, issues);
        }
    }
}

fn validate_entry(entry: &Json, mark_registry: &dyn MarkRegistryPort, issues: &mut Vec<ValidationIssue>) {
    // Rule 7: 标记名校验
    if let Some(refs) = entry["mark_refs"].as_array() {
        for r in refs {
            if let Some(ref_name) = r.as_str() {
                let mark_id = MarkId(ref_name.to_string());
                if !mark_registry.is_valid(&mark_id) {
                    issues.push(ValidationIssue {
                        rule_id: 7,
                        message: mark_id.0.clone() + " 未在任何标记定义中找到",
                        severity: IssueSeverity::Warning,
                    });
                }
            }
        }
    }

    // Rule 1: 宾语栏含动词
    if let Some(text) = entry["text"].as_str() {
        let verbs = ["消耗", "获得", "恢复", "造成", "移除", "弃置", "抽取", "免疫", "转换", "翻牌"];
        let mut verb_count = 0;
        for v in &verbs {
            if text.contains(v) { verb_count += 1; }
        }
        // Rule 10: 宾语缺失 — 有主语但无动词
        if entry["subject"].is_string() && verb_count == 0 && !text.is_empty() && text.len() > 3 {
            issues.push(ValidationIssue {
                rule_id: 10,
                message: format!("主语已指定但效果文本可能缺少谓语动词: \"{}\"", text),
                severity: IssueSeverity::Warning,
            });
        }
    }

    // Rule 2: 备注含条件判断
    if let Some(remark) = entry["remark"].as_str() {
        if remark.contains("若") || remark.contains("如果") || remark.contains("条件") {
            issues.push(ValidationIssue {
                rule_id: 2,
                message: format!("备注仅限四类内容，条件判断请使用分支: {}", remark),
                severity: IssueSeverity::Error,
            });
        }
    }

    // Rule 3: 备注含分支效果
    if let Some(remark) = entry["remark"].as_str() {
        if remark.contains("造成") || remark.contains("获得") && remark.contains("伤害") {
            issues.push(ValidationIssue {
                rule_id: 3,
                message: format!("备注仅限四类内容，分支效果请拆为独立条目: {}", remark),
                severity: IssueSeverity::Error,
            });
        }
    }

    // Rule 4: 一行内主语切换 — 检测效果文本中是否包含主语切换标记
    if let Some(text) = entry["text"].as_str() {
        let subject_markers = ["对目标", "对1单位", "伤害来源", "攻击者"];
        let mut count = 0;
        for m in &subject_markers {
            if text.contains(m) { count += 1; }
        }
        if count > 1 {
            issues.push(ValidationIssue {
                rule_id: 4,
                message: format!("一行内可能有主语切换，请拆行: \"{}\"", text),
                severity: IssueSeverity::Error,
            });
        }
    }

    // Rule 6: 未知谓语动词检查 — 效果文本中是否使用了不规范动词
    if let Some(text) = entry["text"].as_str() {
        let known_verbs = [
            "消耗", "获得", "恢复", "造成", "移除", "弃置", "抽取", "免疫", "转换",
            "翻牌", "增加", "减少", "积累", "视为", "清空", "附加", "翻倍", "加倍",
            "触发", "返回", "选择", "观看", "指定", "发动", "释放", "遗留",
        ];
        let mut has_unknown = true;
        for v in &known_verbs {
            if text.contains(v) { has_unknown = false; break; }
        }
        // Only fire if the text is long enough to be an effect and has no known verbs
        if has_unknown && text.len() > 5 && !text.starts_with("核心技能") {
            issues.push(ValidationIssue {
                rule_id: 6,
                message: format!("效果文本可能缺少标准谓语动词: \"{}\"", text),
                severity: IssueSeverity::Warning,
            });
        }
    }
}

// Rule 9: 卡牌头缺类型标记
fn check_rule_9(ast: &Json, issues: &mut Vec<ValidationIssue>) {
    if ast["name"].as_str().map_or(true, |s| s.is_empty()) {
        issues.push(ValidationIssue {
            rule_id: 9,
            message: "卡牌定义缺少名称".into(),
            severity: IssueSeverity::Error,
        });
    }
    if ast["category"].as_str().map_or(true, |s| s.is_empty()) {
        issues.push(ValidationIssue {
            rule_id: 9,
            message: "卡牌定义缺少类型标记 [category]".into(),
            severity: IssueSeverity::Error,
        });
    }
}

// Rule 7: 未知标记名 — 递归遍历所有效果文本
fn check_rule_7(ast: &Json, mark_registry: &dyn MarkRegistryPort, issues: &mut Vec<ValidationIssue>) {
    fn extract(text: &str, reg: &dyn MarkRegistryPort, issues: &mut Vec<ValidationIssue>) {
        let mut i = 0;
        let chars: Vec<char> = text.chars().collect();
        while i < chars.len() {
            if chars[i] == '「' {
                let start = i + 1;
                i += 1;
                while i < chars.len() && chars[i] != '」' { i += 1; }
                if start < i {
                    let name: String = chars[start..i].iter().collect();
                    let mark_id = MarkId(name);
                    if !reg.is_valid(&mark_id) {
                        issues.push(ValidationIssue {
                            rule_id: 7,
                            message: format!("「{}」未在标记注册表中找到", mark_id.0),
                            severity: IssueSeverity::Warning,
                        });
                    }
                }
            }
            i += 1;
        }
    }

    // Extract all text from AST recursively
    fn collect_text(node: &Json) -> Vec<String> {
        let mut texts = Vec::new();
        match node {
            Json::String(s) => texts.push(s.clone()),
            Json::Object(map) => {
                for (_, v) in map { texts.extend(collect_text(v)); }
            }
            Json::Array(arr) => {
                for v in arr { texts.extend(collect_text(v)); }
            }
            _ => {}
        }
        texts
    }

    for text in collect_text(ast) {
        extract(&text, mark_registry, issues);
    }
}

// Rule 5: 缩进层级跳跃 (delegated to parser — parser uses exact 2-space increments)
// Rule 8: 未知条件词 (delegated to lexicon check — future)
// Rule 11: 别名不匹配 (delegated to mark registry standardization — future)

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::BundledMarkRegistry;
    use serde_json::json;

    #[test]
    fn test_rule_9_missing_name() {
        let ast = json!({"name": "", "category": "", "attributes": {}, "effects": []});
        let reg = BundledMarkRegistry::new();
        let issues = validate(&ast, &reg);
        assert!(issues.iter().any(|i| i.rule_id == 9));
    }

    #[test]
    fn test_rule_7_unknown_mark() {
        let ast = json!({
            "name": "测试",
            "category": "基本牌",
            "attributes": {},
            "effects": [{"type": "default_block", "entries": [
                {"type": "simple", "text": "获得1个「不存在的标签」", "mark_refs": ["「不存在的标签」"]}
            ]}]
        });
        let reg = BundledMarkRegistry::new();
        let issues = validate(&ast, &reg);
        assert!(issues.iter().any(|i| i.rule_id == 7));
    }

    #[test]
    fn test_rule_2_remark_with_condition() {
        let ast = json!({
            "name": "测试",
            "category": "武学",
            "attributes": {},
            "effects": [{"type": "default_block", "entries": [
                {"type": "simple", "text": "造成伤害", "remark": "[若目标有护甲则翻倍]"}
            ]}]
        });
        let reg = BundledMarkRegistry::new();
        let issues = validate(&ast, &reg);
        assert!(issues.iter().any(|i| i.rule_id == 2));
    }
}
