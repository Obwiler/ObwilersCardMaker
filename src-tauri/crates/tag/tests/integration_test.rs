//! tag crate 集成测试：15 标签查询、标记列表、边界条件

use tag::{get_tag_by_name, get_tag_by_id, list_all_tags, list_all_marks};

// ============ 15 标签按名称查询 ============

#[test]
fn test_get_tag_by_name_all_15() {
    let expected_names = [
        "韬光养晦", "一槌定音", "谋定后动", "点石成金", "定向搜寻",
        "藏锋蓄锐", "传檄征召", "以形摹意", "追影逐风", "牵脉连心",
        "洞幽察微", "弃旧图新", "崩山裂石", "先损后利", "荆棘反刺",
    ];
    for name in expected_names {
        let tag = get_tag_by_name(name.to_string());
        assert!(tag.is_some(), "标签 '{}' 应存在", name);
        assert_eq!(tag.unwrap().name, name);
    }
}

// ============ 15 标签按 ID 查询 ============

#[test]
fn test_get_tag_by_id_all_15() {
    for i in 1..=15 {
        let id = format!("tag_{:02}", i);
        let tag = get_tag_by_id(id.clone());
        assert!(tag.is_some(), "标签 ID '{}' 应存在", id);
        assert_eq!(tag.unwrap().tag_id, id);
    }
}

#[test]
fn test_get_tag_by_id_tag_01() {
    let tag = get_tag_by_id("tag_01".to_string()).expect("tag_01 应存在");
    assert_eq!(tag.name, "韬光养晦");
    assert_eq!(tag.first_appearance, "浮光（构筑卡·武学）");
    assert!(!tag.skill_entries.is_empty());
    assert_eq!(tag.skill_entries[0].level, "A");
}

#[test]
fn test_get_tag_by_id_tag_15() {
    let tag = get_tag_by_id("tag_15".to_string()).expect("tag_15 应存在");
    assert_eq!(tag.name, "荆棘反刺");
    assert_eq!(tag.first_appearance, "荆棘（构筑卡·甲胄）");
    assert!(tag.design_intent.contains("以牙还牙"));
}

// ============ 不存在的标签查询 ============

#[test]
fn test_get_tag_by_name_not_found() {
    assert!(get_tag_by_name("不存在的标签".to_string()).is_none());
    assert!(get_tag_by_name("".to_string()).is_none());
    assert!(get_tag_by_name("韬光养晦 ".to_string()).is_none()); // 尾部空格
}

#[test]
fn test_get_tag_by_id_not_found() {
    assert!(get_tag_by_id("tag_00".to_string()).is_none());
    assert!(get_tag_by_id("tag_16".to_string()).is_none());
    assert!(get_tag_by_id("".to_string()).is_none());
    assert!(get_tag_by_id("invalid_id".to_string()).is_none());
}

// ============ list_all_tags ============

#[test]
fn test_list_all_tags_count() {
    let tags = list_all_tags();
    assert_eq!(tags.len(), 15, "应有恰好 15 个标签");
}

#[test]
fn test_list_all_tags_no_duplicate_ids() {
    let tags = list_all_tags();
    let mut ids: Vec<&str> = tags.iter().map(|t| t.tag_id.as_str()).collect();
    ids.sort();
    ids.dedup();
    assert_eq!(ids.len(), 15, "标签 ID 不应重复");
}

#[test]
fn test_list_all_tags_no_duplicate_names() {
    let tags = list_all_tags();
    let mut names: Vec<&str> = tags.iter().map(|t| t.name.as_str()).collect();
    names.sort();
    names.dedup();
    assert_eq!(names.len(), 15, "标签名不应重复");
}

// ============ 标签内容完整性 ============

#[test]
fn test_all_tags_have_skill_entries() {
    for tag in list_all_tags() {
        assert!(!tag.skill_entries.is_empty(), "标签 {} 应有技能词条", tag.tag_id);
        for entry in &tag.skill_entries {
            assert!(!entry.description.is_empty());
            assert!(entry.level == "A" || entry.level == "B" || entry.level == "C");
        }
    }
}

#[test]
fn test_all_tags_have_design_intent() {
    for tag in list_all_tags() {
        assert!(!tag.design_intent.is_empty(), "标签 {} 应有设计初衷", tag.tag_id);
    }
}

#[test]
fn test_all_tags_have_first_appearance() {
    for tag in list_all_tags() {
        assert!(!tag.first_appearance.is_empty(), "标签 {} 应有首次出现卡牌", tag.tag_id);
    }
}

// ============ list_all_marks ============

#[test]
fn test_list_all_marks_count() {
    let marks = list_all_marks();
    assert_eq!(marks.len(), 9, "应有恰好 9 个标记");
}

#[test]
fn test_list_all_marks_names() {
    let marks = list_all_marks();
    let expected = vec![
        "鸣金", "纳灵", "魂印", "罅隙", "铁甲",
        "聚变", "裂变", "蛰伏", "虚形",
    ];
    let actual: Vec<&str> = marks.iter().map(|m| m.name.as_str()).collect();
    assert_eq!(actual, expected);
}

#[test]
fn test_list_all_marks_ids() {
    let marks = list_all_marks();
    for (i, mark) in marks.iter().enumerate() {
        let expected_id = format!("mark_{:02}", i + 1);
        assert_eq!(mark.mark_id, expected_id);
    }
}

// ============ 标签与标记关联 ============

#[test]
fn test_tag_name_id_consistency() {
    let tag = get_tag_by_id("tag_01".to_string()).unwrap();
    let by_name = get_tag_by_name(tag.name.clone()).unwrap();
    assert_eq!(by_name.tag_id, tag.tag_id);
    assert_eq!(by_name.design_intent, tag.design_intent);
}

#[test]
fn test_tag_skill_entry_levels() {
    // 所有标签的技能词条应为 A 级
    for tag in list_all_tags() {
        for entry in &tag.skill_entries {
            assert_eq!(entry.level, "A", "标签 {} 的词条应为 A 级", tag.tag_id);
        }
    }
}
