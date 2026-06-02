use dz_cardmaker_domain::{
    CardAst, CardCategory, CardAttributes, ConstructSubType, BasicQuality,
    EffectBlock, EffectEntry, EffectLine, BranchEntry,
    Mark, MarkType,
    DuelState, PlayerState,
};
use dz_cardmaker_ports::{RuntimeCardId, PlayerId, StaticCardId, MarkId};

mod tests {
    use super::*;

    // ========================================================================
    // CardAst 序列化/反序列化 往返测试
    // ========================================================================

    #[test]
    fn test_cardast_serde_roundtrip() {
        let ast = CardAst {
            category: CardCategory::Construct(ConstructSubType::Blade),
            attributes: CardAttributes {
                life: Some(100),
                armor: Some(20),
                energy: Some(5),
                is_passive: false,
            },
            effects: vec![
                EffectBlock {
                    trigger: Some("condition".into()),
                    entries: vec![
                        EffectEntry::Simple(EffectLine {
                            condition: None,
                            subject: Some("对目标".into()),
                            predicate: "造成".into(),
                            object: "3点伤害".into(),
                            remark: None,
                        }),
                    ],
                },
            ],
        };

        let json = serde_json::to_string(&ast).expect("CardAst 序列化应成功");
        let deserialized: CardAst = serde_json::from_str(&json).expect("CardAst 反序列化应成功");

        assert_eq!(deserialized.attributes.life, Some(100));
        assert_eq!(deserialized.attributes.armor, Some(20));
        assert_eq!(deserialized.attributes.energy, Some(5));
        assert!(!deserialized.attributes.is_passive);

        assert!(matches!(deserialized.category, CardCategory::Construct(ConstructSubType::Blade)),
            "应反序列化为 Construct(Blade)");

        assert_eq!(deserialized.effects.len(), 1);
        if let EffectEntry::Simple(line) = &deserialized.effects[0].entries[0] {
            assert_eq!(line.predicate, "造成");
            assert_eq!(line.object, "3点伤害");
        } else {
            panic!("效果条目应为 Simple 类型");
        }
    }

    // ========================================================================
    // CardCategory 所有枚举变体测试
    // ========================================================================

    #[test]
    fn test_card_category_faction() {
        let cat = CardCategory::Faction;
        let json = serde_json::to_value(&cat).expect("序列化应成功");
        assert_eq!(json, serde_json::json!("Faction"));
    }

    #[test]
    fn test_card_category_career() {
        let cat = CardCategory::Career;
        let json = serde_json::to_value(&cat).expect("序列化应成功");
        assert_eq!(json, serde_json::json!("Career"));
    }

    #[test]
    fn test_card_category_construct_all_subtypes() {
        let subtypes = vec![
            ConstructSubType::Blade,
            ConstructSubType::Treasure,
            ConstructSubType::Armor,
            ConstructSubType::Martial,
            ConstructSubType::Spell,
        ];
        for subtype in &subtypes {
            let cat = CardCategory::Construct(subtype.clone());
            let json = serde_json::to_value(&cat).expect("序列化应成功");
            // serde 将带数据的枚举序列化为 {"Construct": "Blade"} 格式
            assert!(json.is_object(), "Construct 枚举应序列化为 JSON 对象: {}", json);
            let inner = json.get("Construct").expect("应包含 Construct 键");
            let inner_str = inner.as_str().unwrap_or_default();
            assert!(!inner_str.is_empty(), "Construct 内部值不应为空: {}", inner_str);
        }
    }

    #[test]
    fn test_card_category_basic_all_qualities() {
        let qualities = vec![
            BasicQuality::White,
            BasicQuality::Blue,
            BasicQuality::Purple,
            BasicQuality::Orange,
        ];
        for quality in &qualities {
            let cat = CardCategory::Basic(quality.clone());
            let json = serde_json::to_value(&cat).expect("序列化应成功");
            // serde 将带数据的枚举序列化为 {"Basic": "White"} 格式
            assert!(json.is_object(), "Basic 枚举应序列化为 JSON 对象: {}", json);
            let inner = json.get("Basic").expect("应包含 Basic 键");
            let inner_str = inner.as_str().unwrap_or_default();
            assert!(!inner_str.is_empty(), "Basic 内部值不应为空: {}", inner_str);
        }
    }

    // ========================================================================
    // CardAttributes 取值测试
    // ========================================================================

    #[test]
    fn test_card_attributes_defaults() {
        let attrs = CardAttributes {
            life: None,
            armor: None,
            energy: None,
            is_passive: false,
        };
        assert_eq!(attrs.life, None);
        assert_eq!(attrs.armor, None);
        assert_eq!(attrs.energy, None);
        assert!(!attrs.is_passive);
    }

    #[test]
    fn test_card_attributes_partial_values() {
        let attrs = CardAttributes {
            life: Some(80),
            armor: None,
            energy: Some(3),
            is_passive: true,
        };
        assert_eq!(attrs.life, Some(80));
        assert_eq!(attrs.armor, None);
        assert_eq!(attrs.energy, Some(3));
        assert!(attrs.is_passive);
    }

    #[test]
    fn test_card_attributes_full_values() {
        let attrs = CardAttributes {
            life: Some(120),
            armor: Some(15),
            energy: Some(8),
            is_passive: false,
        };
        assert_eq!(attrs.life, Some(120));
        assert_eq!(attrs.armor, Some(15));
        assert_eq!(attrs.energy, Some(8));
        assert!(!attrs.is_passive);
    }

    // ========================================================================
    // EffectBlock 构造测试
    // ========================================================================

    #[test]
    fn test_effect_block_with_trigger_and_entries() {
        let block = EffectBlock {
            trigger: Some("condition".into()),
            entries: vec![
                EffectEntry::Simple(EffectLine {
                    condition: None,
                    subject: None,
                    predicate: "造成".into(),
                    object: "5点伤害".into(),
                    remark: Some("[核心]".into()),
                }),
                EffectEntry::Branch(BranchEntry {
                    condition: "目标生命<30%".into(),
                    entries: vec![
                        EffectEntry::Simple(EffectLine {
                            condition: None,
                            subject: Some("对目标".into()),
                            predicate: "追加".into(),
                            object: "2点伤害".into(),
                            remark: None,
                        }),
                    ],
                }),
            ],
        };

        assert_eq!(block.trigger.as_deref(), Some("condition"));
        assert_eq!(block.entries.len(), 2);

        match &block.entries[0] {
            EffectEntry::Simple(line) => {
                assert_eq!(line.predicate, "造成");
                assert_eq!(line.object, "5点伤害");
                assert_eq!(line.remark.as_deref(), Some("[核心]"));
            }
            _ => panic!("第一个条目应为 Simple"),
        }

        match &block.entries[1] {
            EffectEntry::Branch(branch) => {
                assert_eq!(branch.condition, "目标生命<30%");
                assert_eq!(branch.entries.len(), 1);
            }
            _ => panic!("第二个条目应为 Branch"),
        }
    }

    #[test]
    fn test_effect_block_empty_entries() {
        let block = EffectBlock {
            trigger: None,
            entries: vec![],
        };
        assert!(block.trigger.is_none());
        assert!(block.entries.is_empty());
    }

    // ========================================================================
    // MarkType 变体测试
    // ========================================================================

    #[test]
    fn test_mark_type_all_variants() {
        let variants = vec![
            (MarkType::Cumulative, "Cumulative"),
            (MarkType::Threshold, "Threshold"),
            (MarkType::StoredRelease, "StoredRelease"),
            (MarkType::StackDetonate, "StackDetonate"),
            (MarkType::TurnGain, "TurnGain"),
        ];
        for (variant, expected) in variants {
            let json = serde_json::to_value(&variant).expect("序列化应成功");
            assert_eq!(json.as_str().unwrap_or_default(), expected,
                "MarkType {:?} 应序列化为 '{}'", variant, expected);
        }
    }

    #[test]
    fn test_mark_construction() {
        let mark = Mark {
            id: MarkId("仁心".into()),
            mark_type: MarkType::Cumulative,
        };
        assert_eq!(mark.id.0, "仁心");
        match mark.mark_type {
            MarkType::Cumulative => {}
            _ => panic!("标记类型应为 Cumulative"),
        }
    }

    #[test]
    fn test_mark_serde_roundtrip() {
        let mark = Mark {
            id: MarkId("蓄力".into()),
            mark_type: MarkType::StoredRelease,
        };
        let json = serde_json::to_string(&mark).expect("序列化应成功");
        let deserialized: Mark = serde_json::from_str(&json).expect("反序列化应成功");
        assert_eq!(deserialized.id.0, "蓄力");
        match deserialized.mark_type {
            MarkType::StoredRelease => {}
            _ => panic!("标记类型应保持 StoredRelease"),
        }
    }

    // ========================================================================
    // DuelState 初始化测试
    // ========================================================================

    #[test]
    fn test_duel_state_initialization() {
        let state = DuelState {
            players: vec![
                PlayerState {
                    id: PlayerId("P1".into()),
                    faction: StaticCardId("ZY01".into()),
                    career: StaticCardId("ZY08".into()),
                    hand: vec![
                        RuntimeCardId("GZ01_1".into()),
                        RuntimeCardId("JB01_1".into()),
                    ],
                    field: vec![],
                    deck_count: 28,
                    graveyard: vec![],
                },
                PlayerState {
                    id: PlayerId("P2".into()),
                    faction: StaticCardId("ZY02".into()),
                    career: StaticCardId("ZY05".into()),
                    hand: vec![],
                    field: vec![],
                    deck_count: 30,
                    graveyard: vec![],
                },
            ],
            turn: 1,
            phase: "Draw".into(),
        };

        assert_eq!(state.players.len(), 2);
        assert_eq!(state.turn, 1);
        assert_eq!(state.phase, "Draw");

        assert_eq!(state.players[0].id.0, "P1");
        assert_eq!(state.players[0].faction.0, "ZY01");
        assert_eq!(state.players[0].hand.len(), 2);
        assert_eq!(state.players[0].deck_count, 28);

        assert_eq!(state.players[1].hand.len(), 0);
        assert_eq!(state.players[1].deck_count, 30);
    }

    #[test]
    fn test_duel_state_serde_roundtrip() {
        let state = DuelState {
            players: vec![
                PlayerState {
                    id: PlayerId("P1".into()),
                    faction: StaticCardId("ZY01".into()),
                    career: StaticCardId("ZY08".into()),
                    hand: vec![],
                    field: vec![],
                    deck_count: 30,
                    graveyard: vec![],
                },
            ],
            turn: 1,
            phase: "Main".into(),
        };

        let json = serde_json::to_string_pretty(&state).expect("序列化应成功");
        let deserialized: DuelState = serde_json::from_str(&json).expect("反序列化应成功");

        assert_eq!(deserialized.players.len(), 1);
        assert_eq!(deserialized.turn, 1);
        assert_eq!(deserialized.phase, "Main");
        assert_eq!(deserialized.players[0].id.0, "P1");
        assert_eq!(deserialized.players[0].deck_count, 30);
    }

    #[test]
    fn test_duel_state_empty_players() {
        let state = DuelState {
            players: vec![],
            turn: 0,
            phase: "Init".into(),
        };
        assert!(state.players.is_empty());
        assert_eq!(state.turn, 0);
        assert_eq!(state.phase, "Init");
    }

    // ========================================================================
    // CardCategory 枚举反序列化测试
    // ========================================================================

    #[test]
    fn test_card_category_deserialize_from_json() {
        let json = r#""Faction""#;
        let cat: CardCategory = serde_json::from_str(json).expect("反序列化应成功");
        assert!(matches!(cat, CardCategory::Faction));

        let json = r#""Career""#;
        let cat: CardCategory = serde_json::from_str(json).expect("反序列化应成功");
        assert!(matches!(cat, CardCategory::Career));
    }

    #[test]
    fn test_construct_subtype_deserialize() {
        let json = r#""Blade""#;
        let sub: ConstructSubType = serde_json::from_str(json).expect("反序列化应成功");
        assert!(matches!(sub, ConstructSubType::Blade));

        let json = r#""Spell""#;
        let sub: ConstructSubType = serde_json::from_str(json).expect("反序列化应成功");
        assert!(matches!(sub, ConstructSubType::Spell));
    }

    #[test]
    fn test_basic_quality_deserialize() {
        let json = r#""White""#;
        let q: BasicQuality = serde_json::from_str(json).expect("反序列化应成功");
        assert!(matches!(q, BasicQuality::White));

        let json = r#""Orange""#;
        let q: BasicQuality = serde_json::from_str(json).expect("反序列化应成功");
        assert!(matches!(q, BasicQuality::Orange));
    }
}
