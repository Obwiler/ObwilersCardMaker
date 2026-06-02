//! 数据治理模块 — JSON Schema 校验、重复检测、导入导出
//!
//! 提供卡牌数据文件的完整性与可靠性保障：
//! - validate_cards_json: 对照 cards.schema.json 进行结构校验
//! - detect_duplicates: 按 name + text 哈希检测疑似重复卡牌
//! - export_cards / import_cards: 卡牌数据的导入导出

use crate::card_data::Card;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

// ============ JSON Schema 校验 ============

/// 单条校验错误详情
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonValidationError {
    /// 错误所在卡牌 ID（如 card_005）
    pub card_id: String,
    /// 错误所在卡牌名称
    pub card_name: String,
    /// 出错字段名
    pub field: String,
    /// 错误描述
    pub message: String,
}

/// JSON Schema 校验结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonValidationResult {
    /// 是否全部通过
    pub valid: bool,
    /// 校验的卡牌总数
    pub total_cards: usize,
    /// 错误列表
    pub errors: Vec<JsonValidationError>,
}

/// 校验 cards.json 内容的 JSON 结构完整性
///
/// 不依赖外部 Schema 文件，直接内置规则进行校验：
/// - 顶层必须是对象，包含 cards 数组
/// - 每张卡牌的必填字段（id / name / text / list_tags / pre_tag / duel_tags / created_at / modified_at）
/// - id 格式必须为 card_NNN
/// - id 不能重复
/// - name 和 text 不能为空
pub fn validate_cards_json(json_str: &str) -> JsonValidationResult {
    let mut errors: Vec<JsonValidationError> = Vec::new();

    // 1. 解析 JSON
    let parsed: serde_json::Value = match serde_json::from_str(json_str) {
        Ok(v) => v,
        Err(e) => {
            return JsonValidationResult {
                valid: false,
                total_cards: 0,
                errors: vec![JsonValidationError {
                    card_id: "N/A".into(),
                    card_name: "N/A".into(),
                    field: "root".into(),
                    message: format!("JSON 解析失败: {}", e),
                }],
            };
        }
    };

    // 2. 检查顶层结构
    let cards_array = match &parsed {
        // 新格式: { "_meta": ..., "cards": [...] }
        serde_json::Value::Object(obj) if obj.contains_key("cards") => {
            match obj.get("cards") {
                Some(serde_json::Value::Array(arr)) => arr,
                _ => {
                    return JsonValidationResult {
                        valid: false,
                        total_cards: 0,
                        errors: vec![JsonValidationError {
                            card_id: "N/A".into(),
                            card_name: "N/A".into(),
                            field: "cards".into(),
                            message: "顶层 cards 字段必须是数组".into(),
                        }],
                    };
                }
            }
        }
        // 旧格式: 顶层直接是数组 [...]
        serde_json::Value::Array(arr) => arr,
        other => {
            return JsonValidationResult {
                valid: false,
                total_cards: 0,
                errors: vec![JsonValidationError {
                    card_id: "N/A".into(),
                    card_name: "N/A".into(),
                    field: "root".into(),
                    message: format!("顶层类型必须为数组或包含 cards 键的对象，实际为: {}", 
                        match other { serde_json::Value::Object(_) => "Object(无cards键)", _ => "非数组/对象" }),
                }],
            };
        }
    };

    let total = cards_array.len();
    let mut seen_ids: HashSet<String> = HashSet::new();

    for (idx, item) in cards_array.iter().enumerate() {
        let obj = match item {
            serde_json::Value::Object(o) => o,
            _ => {
                errors.push(JsonValidationError {
                    card_id: format!("索引[{}]", idx),
                    card_name: "N/A".into(),
                    field: "entry".into(),
                    message: "卡牌条目必须是 JSON 对象".into(),
                });
                continue;
            }
        };

        // 提取 id 和 name（如果存在）
        let card_id = obj.get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("(缺失)")
            .to_string();
        let card_name = obj.get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("(缺失)")
            .to_string();

        // 检查 id
        match obj.get("id") {
            None => {
                errors.push(JsonValidationError {
                    card_id: format!("索引[{}]", idx),
                    card_name: card_name.clone(),
                    field: "id".into(),
                    message: "缺少必填字段 id".into(),
                });
            }
            Some(v) if !v.is_string() => {
                errors.push(JsonValidationError {
                    card_id: format!("索引[{}]", idx),
                    card_name: card_name.clone(),
                    field: "id".into(),
                    message: "id 字段必须是字符串".into(),
                });
            }
            Some(v) => {
                let id_str = v.as_str().unwrap();
                if id_str.is_empty() {
                    errors.push(JsonValidationError {
                        card_id: format!("索引[{}]", idx),
                        card_name: card_name.clone(),
                        field: "id".into(),
                        message: "id 字段不能为空字符串".into(),
                    });
                } else if !id_str.starts_with("card_") {
                    errors.push(JsonValidationError {
                        card_id: id_str.to_string(),
                        card_name: card_name.clone(),
                        field: "id".into(),
                        message: format!("id 格式不正确，应为 card_NNN，实际为 '{}'", id_str),
                    });
                } else if !seen_ids.insert(id_str.to_string()) {
                    errors.push(JsonValidationError {
                        card_id: id_str.to_string(),
                        card_name: card_name.clone(),
                        field: "id".into(),
                        message: format!("id '{}' 重复出现", id_str),
                    });
                }
            }
        }

        // 检查 name
        match obj.get("name") {
            None => {
                errors.push(JsonValidationError {
                    card_id: card_id.clone(),
                    card_name: "(缺失)".into(),
                    field: "name".into(),
                    message: "缺少必填字段 name".into(),
                });
            }
            Some(v) if !v.is_string() || v.as_str().unwrap().is_empty() => {
                errors.push(JsonValidationError {
                    card_id: card_id.clone(),
                    card_name: card_name.clone(),
                    field: "name".into(),
                    message: "name 字段不能为空".into(),
                });
            }
            _ => {}
        }

        // 检查 text
        match obj.get("text") {
            None => {
                errors.push(JsonValidationError {
                    card_id: card_id.clone(),
                    card_name: card_name.clone(),
                    field: "text".into(),
                    message: "缺少必填字段 text".into(),
                });
            }
            Some(v) if !v.is_string() => {
                errors.push(JsonValidationError {
                    card_id: card_id.clone(),
                    card_name: card_name.clone(),
                    field: "text".into(),
                    message: "text 字段必须是字符串".into(),
                });
            }
            _ => {}
        }

        // 检查数组字段
        for field in &["list_tags", "pre_tag", "duel_tags"] {
            match obj.get(*field) {
                None => {
                    errors.push(JsonValidationError {
                        card_id: card_id.clone(),
                        card_name: card_name.clone(),
                        field: field.to_string(),
                        message: format!("缺少必填字段 {}", field),
                    });
                }
                Some(v) if !v.is_array() => {
                    errors.push(JsonValidationError {
                        card_id: card_id.clone(),
                        card_name: card_name.clone(),
                        field: field.to_string(),
                        message: format!("{} 字段必须是数组", field),
                    });
                }
                _ => {}
            }
        }

        // 检查日期字段
        for field in &["created_at", "modified_at"] {
            match obj.get(*field) {
                None => {
                    errors.push(JsonValidationError {
                        card_id: card_id.clone(),
                        card_name: card_name.clone(),
                        field: field.to_string(),
                        message: format!("缺少必填字段 {}", field),
                    });
                }
                Some(v) if !v.is_string() => {
                    errors.push(JsonValidationError {
                        card_id: card_id.clone(),
                        card_name: card_name.clone(),
                        field: field.to_string(),
                        message: format!("{} 字段必须是字符串", field),
                    });
                }
                _ => {}
            }
        }
    }

    JsonValidationResult {
        valid: errors.is_empty(),
        total_cards: total,
        errors,
    }
}

/// 基于当前运行时卡牌数据进行 JSON 校验（序列化后校验）
pub fn validate_current_cards() -> JsonValidationResult {
    let cards = crate::card_data::load_all_cards();
    let json_str = serde_json::to_string(&cards).unwrap_or_default();
    validate_cards_json(&json_str)
}

// ============ 重复检测 ============

/// 一对疑似重复的卡牌
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicatePair {
    pub card_a_id: String,
    pub card_a_name: String,
    pub card_b_id: String,
    pub card_b_name: String,
    /// 重复类型: "name" 名称相同, "text_hash" 文本哈希相同, "both" 两者都相同
    pub reason: String,
}

/// 基于当前运行时卡牌数据检测重复
pub fn detect_duplicates() -> Vec<DuplicatePair> {
    let cards = crate::card_data::load_all_cards();
    let mut pairs: Vec<DuplicatePair> = Vec::new();

    for i in 0..cards.len() {
        for j in (i + 1)..cards.len() {
            let a = &cards[i];
            let b = &cards[j];

            let name_match = a.name == b.name;
            let text_match = a.text == b.text;

            if name_match || text_match {
                let reason = if name_match && text_match {
                    "both".to_string()
                } else if name_match {
                    "name".to_string()
                } else {
                    "text_hash".to_string()
                };

                pairs.push(DuplicatePair {
                    card_a_id: a.id.clone(),
                    card_a_name: a.name.clone(),
                    card_b_id: b.id.clone(),
                    card_b_name: b.name.clone(),
                    reason,
                });
            }
        }
    }

    pairs
}

// ============ 卡牌导入导出 ============

/// 导出格式：与 cards.json 中卡牌对象结构一致
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportData {
    /// 导出元信息
    pub _export_meta: ExportMeta,
    /// 导出的卡牌列表
    pub cards: Vec<Card>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportMeta {
    pub exported_at: String,
    pub count: usize,
    pub source_version: String,
}

/// 导出指定 ID 的卡牌为 JSON 字符串
pub fn export_cards(ids: &[String]) -> Result<String, String> {
    let all_cards = crate::card_data::load_all_cards();
    let id_set: HashSet<&str> = ids.iter().map(|s| s.as_str()).collect();

    let selected: Vec<Card> = all_cards
        .into_iter()
        .filter(|c| id_set.contains(c.id.as_str()))
        .collect();

    if selected.is_empty() {
        return Err("没有找到匹配 ID 的卡牌".into());
    }

    let now = crate::card_data::iso8601_now();
    let export = ExportData {
        _export_meta: ExportMeta {
            exported_at: now,
            count: selected.len(),
            source_version: "0.9.1".into(),
        },
        cards: selected,
    };

    serde_json::to_string_pretty(&export)
        .map_err(|e| format!("序列化导出数据失败: {}", e))
}

/// 导入 JSON 字符串中的卡牌，合并到当前卡牌池
///
/// - 手动解析 JSON 以支持新旧格式
/// - 跳过已存在 ID 的卡牌
/// - 返回 (导入数量, 跳过数量, 跳过详情)
pub fn import_cards(json_str: &str) -> Result<ImportResult, String> {
    let parsed: serde_json::Value = serde_json::from_str(json_str)
        .map_err(|e| format!("JSON 解析失败: {}", e))?;

    let incoming: Vec<Card> = match &parsed {
        // 新导出格式: { _export_meta: ..., cards: [...] }
        serde_json::Value::Object(obj) if obj.contains_key("cards") => {
            serde_json::from_value(obj["cards"].clone())
                .map_err(|e| format!("cards 数组解析失败: {}", e))?
        }
        // 旧格式: 数组
        serde_json::Value::Array(_) => {
            serde_json::from_value(parsed)
                .map_err(|e| format!("卡牌数组解析失败: {}", e))?
        }
        _ => return Err("无法识别的导入格式，顶层应为数组或包含 cards 键的对象".into()),
    };

    let guard = crate::card_data::store_ref();
    let mut store = guard.write().map_err(|e| e.to_string())?;

    let existing_ids: HashSet<String> = store.iter().map(|c| c.id.clone()).collect();

    let mut imported = 0usize;
    let mut skipped = 0usize;
    let mut skipped_details: Vec<String> = Vec::new();

    for card in incoming {
        if existing_ids.contains(&card.id) {
            skipped += 1;
            skipped_details.push(format!("{} ({}) — ID 已存在", card.id, card.name));
        } else {
            store.push(card);
            imported += 1;
        }
    }

    let result = ImportResult {
        imported,
        skipped,
        skipped_details,
        total_after: store.len(),
    };

    drop(store);
    crate::card_data::auto_save();
    Ok(result)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported: usize,
    pub skipped: usize,
    pub skipped_details: Vec<String>,
    pub total_after: usize,
}
