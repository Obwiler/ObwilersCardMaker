//! 语法校验器
//!
//! 校验每张卡牌的语法完整性：
//! - 五段式完整性
//! - 主语合法性
//! - 谓语合法性
//! - 标签引用有效性
//! - 语法格式合规

use crate::card_data::Card;
use serde::{Deserialize, Serialize};

/// 单条校验错误
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub card_name: String,
    pub line: usize,
    pub description: String,
}

/// 卡牌校验结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardValidation {
    pub card_name: String,
    pub has_ast: bool,
    pub entry_count: usize,
    pub tag_def_count: usize,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<String>,
}

/// 合法主语集合（五段式中可出现的主语）
const VALID_SUBJECTS: &[&str] = &[
    "自身", "目标", "攻击者", "敌方", "友方", "所有玩家",
    "伤害来源", "当前回合玩家", "下一位玩家", "上一位玩家",
    "该紫卡效果", "该「御守」", "攻击者",
];

/// 合法谓语集合
const VALID_PREDICATES: &[&str] = &[
    "造成", "恢复", "获得", "消耗", "执行", "抽取", "弃置", "弃置或交给其他玩家",
    "增加", "降低", "扣除", "赋予", "转化", "限制", "免疫", "封锁",
    "强制目标弃置", "令目标出示", "翻牌堆顶", "重排", "使", "使目标进入",
    "复制","移除","重置","锁定","补充","存储","更换为","进行",
    "附加","传递","转换为","额外获得","额外抽取","将对目标",
    "可将本卡叠放至","可将蓝卡当作","当作","视为",
    "抵消","使无效","无效化","无效","淘汰","放置","放回",
    "选择保留","宣言","明示所有蓝卡","强制使",
    "再抽取","获取","再获取","抽取并公示目标","抽取并立即使用",
    "强制目标在自身回合开始时","额外附加","额外扣除",
    "对伤害来源使用",
];

/// 合法标签名（15个对峙标签）
const VALID_TAGS: &[&str] = &[
    "韬光养晦", "一槌定音", "谋定后动", "点石成金", "定向搜寻",
    "藏锋蓄锐", "传檄征召", "以形摹意", "追影逐风", "牵脉连心",
    "洞幽察微", "弃旧图新", "崩山裂石", "先损后利", "荆棘反刺",
];

/// 校验单张卡牌
pub fn validate_card(card: &Card) -> CardValidation {
    let mut errors: Vec<ValidationError> = vec![];
    let mut warnings: Vec<String> = vec![];

    let ast = match &card.ast {
        Some(a) => a,
        None => {
            return CardValidation {
                card_name: card.name.clone(),
                has_ast: false,
                entry_count: 0,
                tag_def_count: 0,
                errors: card.errors.iter().map(|e| ValidationError {
                    card_name: card.name.clone(),
                    line: 0,
                    description: e.clone(),
                }).collect(),
                warnings: vec!["卡牌解析失败，无法进行深度语法校验".to_string()],
            };
        }
    };

    // 1. 标签引用有效性校验
    for td in &ast.tag_defs {
        if !VALID_TAGS.contains(&td.tag_name.as_str()) {
            errors.push(ValidationError {
                card_name: card.name.clone(),
                line: 0,
                description: format!("标签定义块 '{}' 不在已知15标签中", td.tag_name),
            });
        }
        if td.entries.is_empty() {
            warnings.push(format!("标签定义块 '{}' 没有子条目", td.tag_name));
        }
    }

    // 2. 条目校验
    for (idx, entry) in ast.entries.iter().enumerate() {
        let line = idx + 1;

        // 五段式完整性
        let empty_count = [
            entry.condition.is_empty(),
            entry.subject.is_empty(),
            entry.predicate.is_empty(),
            entry.object.is_empty(),
        ].iter().filter(|&&x| x).count();

        if empty_count >= 4 {
            errors.push(ValidationError {
                card_name: card.name.clone(),
                line,
                description: format!("条目 '{}' 五段式几乎全空，至少需要主语+谓语", entry.id),
            });
        }

        // 谓语合法性
        if !entry.predicate.is_empty() {
            let pred = entry.predicate.trim();
            // 支持「」包裹的谓语
            let pred_clean = pred.trim_matches(|c: char| c == '「' || c == '」');
            if !VALID_PREDICATES.iter().any(|vp| pred_clean.starts_with(vp) || pred_clean.contains(vp)) {
                // 某些谓语可能是复合的（如 "造成目标1点法术伤害" 中的"造成"）
                // 宽容匹配：以合法谓语开头即可
                let found = VALID_PREDICATES.iter().any(|vp| pred_clean.starts_with(vp));
                if !found {
                    warnings.push(format!("条目 '{}' 谓语 '{}' 可能不在标准谓语库中", entry.id, pred_clean));
                }
            }
        }

        // 主语合法性
        if !entry.subject.is_empty() {
            let subj = entry.subject.trim();
            if !subj.is_empty() {
                let found = VALID_SUBJECTS.iter().any(|vs| subj.contains(vs));
                if !found && !subj.contains("自身") && !subj.contains("目标") && !subj.contains("该") {
                    warnings.push(format!("条目 '{}' 主语 '{}' 可能不在标准主语库中", entry.id, subj));
                }
            }
        }

        // 检查条件段是否有 — 占位符用法
        if entry.condition == "—" && entry.subject.is_empty() && entry.predicate.is_empty() {
            // 可能是表格行，跳过
            continue;
        }
    }

    // 3. 标签引用有效性（在五段式中检查 [TagName] 引用）
    for entry in &ast.entries {
        for segment in &[&entry.condition, &entry.subject, &entry.predicate, &entry.object, &entry.note] {
            if let Some(tag_ref) = extract_tag_refs(segment) {
                for tag in &tag_ref {
                    if !VALID_TAGS.contains(&tag.as_str()) {
                        warnings.push(format!(
                            "条目 '{}' 中引用的标签 '[{}]' 不在已知15标签中",
                            entry.id, tag
                        ));
                    }
                }
            }
        }
    }

    CardValidation {
        card_name: card.name.clone(),
        has_ast: true,
        entry_count: ast.entries.len(),
        tag_def_count: ast.tag_defs.len(),
        errors,
        warnings,
    }
}

/// 从文本段中提取所有 [TagName] 引用
fn extract_tag_refs(text: &str) -> Option<Vec<String>> {
    let mut tags = vec![];
    let mut chars = text.chars().peekable();
    loop {
        match chars.next() {
            Some('[') => {
                let mut tag = String::new();
                let mut found_close = false;
                while let Some(c) = chars.next() {
                    if c == ']' { found_close = true; break; }
                    tag.push(c);
                }
                if found_close && !tag.is_empty() && !tag.contains('|') && !tag.contains('：') {
                    tags.push(tag);
                }
            }
            None => break,
            _ => continue,
        }
    }
    if tags.is_empty() { None } else { Some(tags) }
}

/// 批量校验所有卡牌
pub fn validate_all(cards: &[Card]) -> Vec<CardValidation> {
    cards.iter().map(|c| validate_card(c)).collect()
}

/// 输出校验统计
#[allow(dead_code)]
pub fn validation_stats(validations: &[CardValidation]) -> (usize, usize, usize) {
    let total = validations.len();
    let with_errors = validations.iter().filter(|v| !v.errors.is_empty()).count();
    let clean = total - with_errors;
    (total, clean, with_errors)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_tag_refs() {
        assert_eq!(extract_tag_refs("[韬光养晦]"), Some(vec!["韬光养晦".to_string()]));
        assert_eq!(extract_tag_refs("执行 → [一槌定音] → —"), Some(vec!["一槌定音".to_string()]));
        assert_eq!(extract_tag_refs("无标签"), None);
    }

    #[test]
    fn test_validate_sample_cards() {
        // 只测试少量样本卡牌，避免加载全部 157 张导致栈溢出
        use crate::card_data::Card;
        use crate::parser::parse_card_text;

        let samples = &[
            ("儒家", "\
消耗1「仁心」 → 自身 → 恢复 → 1点技力 → —\n\
消耗1「仁心」 → 自身 → 抽取 → 1张牌 → —"),
            ("击敌", "消耗1次攻击次数 → 自身 → 造成 → 目标物理伤害（数值=攻击力） → 每回合限1次攻击机会"),
            ("蓄势", "\
使用 → 自身 → 执行 → [谋定后动] → —\n\
[谋定后动]定义：\n| A | 选择伤害 | 自身 | 增加 | 下次伤害+1 | 效果不可叠加 |\n| B | 选择治疗 | 自身 | 增加 | 下次治疗+1 | 效果不可叠加 |"),
            ("斩将", "目标生命＜2且护甲＜2 → 自身 → 淘汰 → 目标 → 直接淘汰"),
        ];

        let mut cards = vec![];
        for (name, text) in samples {
            let result = parse_card_text(name, text);
            let errors: Vec<String> = result.errors.iter().map(|e| e.message.clone()).collect();
            cards.push(Card {
                name: name.to_string(),
                list_tags: vec![],
                pre_tag: vec![],
                duel_tags: vec![],
                text: text.to_string(),
                ast: result.ast,
                errors,
            });
        }

        let results = validate_all(&cards);
        let (total, clean, _) = validation_stats(&results);
        assert!(total == 4);
        assert!(clean >= 3); // 至少 3 张通过
    }

    #[test]
    fn test_validate_empty_card() {
        use crate::card_data::Card;
        let card = Card {
            name: "空卡".into(),
            list_tags: vec![],
            pre_tag: vec![],
            duel_tags: vec![],
            text: "".into(),
            ast: None,
            errors: vec![],
        };
        let result = validate_card(&card);
        assert!(!result.has_ast);
        assert_eq!(result.entry_count, 0);
    }

    #[test]
    fn test_validate_known_tag_reference() {
        use crate::card_data::Card;
        use crate::parser::parse_card_text;
        use crate::parser::CardAst;
        use crate::parser::CardEntry;

        let ast = CardAst {
            name: "测试".into(),
            entries: vec![CardEntry {
                id: "A".into(),
                condition: "消耗1技力".into(),
                subject: "自身".into(),
                predicate: "执行".into(),
                object: "[韬光养晦]".into(),
                note: "—".into(),
            }],
            tag_defs: vec![],
            duel_tags: vec!["韬光养晦".into()],
        };

        let card = Card {
            name: "测试".into(),
            list_tags: vec![],
            pre_tag: vec![],
            duel_tags: vec![],
            text: "测试".into(),
            ast: Some(ast),
            errors: vec![],
        };
        let result = validate_card(&card);
        assert!(result.has_ast);
        assert_eq!(result.entry_count, 1);
        // 韬光养晦 是已知标签，不应有标签引用警告
    }

    #[test]
    fn test_extract_tag_refs_multiple() {
        let refs = extract_tag_refs("[韬光养晦] 和 [一槌定音]");
        assert_eq!(refs, Some(vec!["韬光养晦".to_string(), "一槌定音".to_string()]));
    }

    #[test]
    fn test_extract_tag_refs_with_pipe() {
        // 表格语法 | ... | 中的假 [ ] 不应被识别为标签
        let refs = extract_tag_refs("| A | — | 自身 |");
        assert_eq!(refs, None);
    }

    #[test]
    fn test_extract_tag_refs_with_colon() {
        // [标签名：中文] 不应识别为标签
        let refs = extract_tag_refs("[标签：test]");
        assert_eq!(refs, None);
    }

    #[test]
    fn test_validation_stats() {
        let results = vec![
            CardValidation {
                card_name: "pass1".into(), has_ast: true, entry_count: 2, tag_def_count: 0,
                errors: vec![], warnings: vec![],
            },
            CardValidation {
                card_name: "pass2".into(), has_ast: true, entry_count: 1, tag_def_count: 0,
                errors: vec![], warnings: vec!["warning".into()],
            },
            CardValidation {
                card_name: "fail1".into(), has_ast: true, entry_count: 1, tag_def_count: 0,
                errors: vec![ValidationError { card_name: "fail1".into(), line: 1, description: "err".into() }],
                warnings: vec![],
            },
        ];
        let (total, clean, with_errors) = validation_stats(&results);
        assert_eq!(total, 3);
        assert_eq!(clean, 2);
        assert_eq!(with_errors, 1);
    }
}
