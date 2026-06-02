//! core crate 集成测试：Card 序列化/反序列化、Error 类型、边界条件

use cardmaker_core::card::{Card, CardId, Stat, Zone};
use cardmaker_core::tag::{Mark, Tag as CoreTag};
use cardmaker_core::error::CoreError;
use serde_json;

// ============ Card 序列化/反序列化 ============

#[test]
fn test_card_serde_roundtrip() {
    let card = Card {
        id: CardId::from("card_001"),
        name: "击敌".to_string(),
        tags: vec!["基本牌".to_string(), "白色".to_string()],
        text: "消耗1次攻击次数 → 自身 → 造成 → 目标物理伤害 → 每回合限1次".to_string(),
    };
    let json = serde_json::to_string(&card).unwrap();
    let restored: Card = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.id, card.id);
    assert_eq!(restored.name, card.name);
    assert_eq!(restored.tags, card.tags);
    assert_eq!(restored.text, card.text);
}

#[test]
fn test_card_serde_empty_fields() {
    let card = Card {
        id: "".to_string(),
        name: "".to_string(),
        tags: vec![],
        text: "".to_string(),
    };
    let json = serde_json::to_string(&card).unwrap();
    let restored: Card = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.id, "");
    assert_eq!(restored.name, "");
    assert!(restored.tags.is_empty());
    assert_eq!(restored.text, "");
}

#[test]
fn test_card_serde_special_characters() {
    let card = Card {
        id: "card_special".to_string(),
        name: "超长名称—包含→箭头《书名》".to_string(),
        tags: vec!["tag with spaces".to_string(), "emoji_🎯".to_string()],
        text: "消耗1「标记」 → 自身 → 执行 → [一槌定音] → 每回合限1次\n第二行\n第三行".to_string(),
    };
    let json = serde_json::to_string(&card).unwrap();
    let restored: Card = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.name, card.name);
    assert_eq!(restored.tags, card.tags);
    assert_eq!(restored.text, card.text);
}

#[test]
fn test_card_serde_unicode() {
    let card = Card {
        id: "unicode_卡牌".to_string(),
        name: "テスト".to_string(),
        tags: vec!["タグ".to_string(), "מארק".to_string()],
        text: "消耗 → →".to_string(),
    };
    let json = serde_json::to_string(&card).unwrap();
    let restored: Card = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.name, "テスト");
    assert_eq!(restored.tags.len(), 2);
}

#[test]
fn test_card_serde_invalid_json() {
    let result: Result<Card, _> = serde_json::from_str("{ invalid json }");
    assert!(result.is_err());
}

#[test]
fn test_card_serde_missing_field() {
    // id 缺失应报错
    let json = r#"{"name":"test","tags":[],"text":""}"#;
    let result: Result<Card, _> = serde_json::from_str(json);
    assert!(result.is_err());
}

// ============ Zone 枚举 ============

#[test]
fn test_zone_equality() {
    assert_eq!(Zone::Deck, Zone::Deck);
    assert_ne!(Zone::Deck, Zone::Hand);
    assert_eq!(Zone::Field, Zone::Field);
    assert_eq!(Zone::Graveyard, Zone::Graveyard);
    assert_eq!(Zone::Exile, Zone::Exile);
}

#[test]
fn test_zone_serde_roundtrip() {
    for zone in &[Zone::Deck, Zone::Hand, Zone::Field, Zone::Graveyard, Zone::Exile] {
        let json = serde_json::to_string(zone).unwrap();
        let restored: Zone = serde_json::from_str(&json).unwrap();
        assert_eq!(*zone, restored);
    }
}

// ============ Stat 类型 ============

#[test]
fn test_stat_serde() {
    let stat = Stat { name: "攻击力".to_string(), value: 3 };
    let json = serde_json::to_string(&stat).unwrap();
    let restored: Stat = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.name, "攻击力");
    assert_eq!(restored.value, 3);
}

#[test]
fn test_stat_negative_value() {
    let stat = Stat { name: "debuff".to_string(), value: -5 };
    let json = serde_json::to_string(&stat).unwrap();
    let restored: Stat = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.value, -5);
}

// ============ Tag (core) 序列化 ============

#[test]
fn test_core_tag_serde() {
    let tag = CoreTag {
        id: "tag_01".to_string(),
        name: "韬光养晦".to_string(),
        color: "#FF0000".to_string(),
        description: "消耗手牌换取伤害免疫".to_string(),
    };
    let json = serde_json::to_string(&tag).unwrap();
    let restored: CoreTag = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.id, "tag_01");
    assert_eq!(restored.name, "韬光养晦");
    assert_eq!(restored.color, "#FF0000");
}

// ============ Mark (core) 序列化 ============

#[test]
fn test_core_mark_serde() {
    let mark = Mark {
        id: "mark_01".to_string(),
        tag_id: "tag_01".to_string(),
        card_id: "card_001".to_string(),
        note: "初始标记".to_string(),
    };
    let json = serde_json::to_string(&mark).unwrap();
    let restored: Mark = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.id, "mark_01");
    assert_eq!(restored.tag_id, "tag_01");
    assert_eq!(restored.card_id, "card_001");
}

// ============ CoreError Display / Debug ============

#[test]
fn test_error_display_not_found() {
    let err = CoreError::NotFound {
        entity: "卡牌".to_string(),
        id: "card_999".to_string(),
    };
    let s = format!("{}", err);
    assert!(s.contains("卡牌"));
    assert!(s.contains("card_999"));
    assert!(s.contains("not found"));
}

#[test]
fn test_error_display_parse_error() {
    let err = CoreError::ParseError {
        card: "击敌".to_string(),
        detail: "缺失箭头分隔符".to_string(),
    };
    let s = format!("{}", err);
    assert!(s.contains("击敌"));
    assert!(s.contains("parse error"));
}

#[test]
fn test_error_display_validate_error() {
    let err = CoreError::ValidateError {
        card: "御守".to_string(),
        detail: "主语不合法".to_string(),
    };
    let s = format!("{}", err);
    assert!(s.contains("御守"));
    assert!(s.contains("validation error"));
}

#[test]
fn test_error_display_duel_error() {
    let err = CoreError::DuelError {
        detail: "场景不存在".to_string(),
    };
    let s = format!("{}", err);
    assert!(s.contains("duel error"));
}

#[test]
fn test_error_display_io_error() {
    let err = CoreError::IoError {
        detail: "权限不足".to_string(),
    };
    let s = format!("{}", err);
    assert!(s.contains("io error"));
}

#[test]
fn test_error_debug_format() {
    let err = CoreError::NotFound {
        entity: "标签".to_string(),
        id: "tag_99".to_string(),
    };
    let dbg = format!("{:?}", err);
    assert!(dbg.contains("NotFound"));
    assert!(dbg.contains("标签"));
}

#[test]
fn test_error_serde_roundtrip() {
    let err = CoreError::ParseError {
        card: "测试卡".to_string(),
        detail: "格式错误".to_string(),
    };
    let json = serde_json::to_string(&err).unwrap();
    let restored: CoreError = serde_json::from_str(&json).unwrap();
    let restored_str = format!("{}", restored);
    assert!(restored_str.contains("测试卡"));
}

// ============ 边界条件 ============

#[test]
fn test_card_very_long_name() {
    let long_name = "卡".repeat(1000);
    let card = Card {
        id: "long".to_string(),
        name: long_name.clone(),
        tags: vec![],
        text: "".to_string(),
    };
    let json = serde_json::to_string(&card).unwrap();
    let restored: Card = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.name.len(), 1000);
}

#[test]
fn test_card_very_long_text() {
    let long_text = "文本 ".repeat(5000);
    let card = Card {
        id: "long_text".to_string(),
        name: "测试".to_string(),
        tags: vec![],
        text: long_text.clone(),
    };
    let json = serde_json::to_string(&card).unwrap();
    let restored: Card = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.text.len(), long_text.len());
}
