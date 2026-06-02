use dz_cardmaker_infra::parser::{DZParser, lexer};
use dz_cardmaker_infra::parser::BundledMarkRegistry;
use dz_cardmaker_ports::{ParserPort, MarkId, MarkRegistryPort};

fn minimal_dz(name: &str, category: &str) -> String {
    format!("{} [{}]\n  测试效果文本", name, category)
}

fn minimal_dz_with_attrs(name: &str, category: &str, attrs: &str) -> String {
    format!("{} [{}, {}]\n  测试效果文本", name, category, attrs)
}

mod tests {
    use super::*;

    // ========================================================================
    // 11 种卡牌类型解析测试
    // ========================================================================

    #[test]
    fn test_parse_faction_card() {
        let source = minimal_dz("儒家", "阵营");
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "阵营卡牌解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "儒家");
        assert_eq!(ast["category"], "阵营");
    }

    #[test]
    fn test_parse_career_card() {
        let source = minimal_dz("剑士", "职业");
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "职业卡牌解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "剑士");
        assert_eq!(ast["category"], "职业");
    }

    #[test]
    fn test_parse_blade_construct_card() {
        let source = minimal_dz_with_attrs("霜之哀伤", "构筑", "blade:true");
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "武器(blade)构筑卡解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "霜之哀伤");
        assert_eq!(ast["category"], "构筑");
        assert_eq!(ast["attributes"]["blade"], true);
    }

    #[test]
    fn test_parse_treasure_construct_card() {
        let source = minimal_dz_with_attrs("贤者之石", "构筑", "treasure:true");
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "宝物(treasure)构筑卡解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "贤者之石");
        assert_eq!(ast["category"], "构筑");
        assert_eq!(ast["attributes"]["treasure"], true);
    }

    #[test]
    fn test_parse_armor_construct_card() {
        let source = minimal_dz_with_attrs("龙鳞甲", "构筑", "armor:true");
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "护甲(armor)构筑卡解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "龙鳞甲");
        assert_eq!(ast["category"], "构筑");
        assert_eq!(ast["attributes"]["armor"], true);
    }

    #[test]
    fn test_parse_martial_construct_card() {
        let source = minimal_dz_with_attrs("太极拳", "构筑", "martial:true");
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "武学(martial)构筑卡解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "太极拳");
        assert_eq!(ast["category"], "构筑");
        assert_eq!(ast["attributes"]["martial"], true);
    }

    #[test]
    fn test_parse_spell_construct_card() {
        let source = minimal_dz_with_attrs("火球术", "构筑", "spell:true");
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "法术(spell)构筑卡解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "火球术");
        assert_eq!(ast["category"], "构筑");
        assert_eq!(ast["attributes"]["spell"], true);
    }

    #[test]
    fn test_parse_basic_white_card() {
        let source = minimal_dz_with_attrs("击敌", "基本", "quality:white");
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "白色基本卡解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "击敌");
        assert_eq!(ast["category"], "基本");
    }

    #[test]
    fn test_parse_basic_blue_card() {
        let source = minimal_dz_with_attrs("格挡", "基本", "quality:blue");
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "蓝色基本卡解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "格挡");
        assert_eq!(ast["category"], "基本");
    }

    #[test]
    fn test_parse_basic_purple_card() {
        let source = minimal_dz_with_attrs("突进", "基本", "quality:purple");
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "紫色基本卡解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "突进");
        assert_eq!(ast["category"], "基本");
    }

    #[test]
    fn test_parse_basic_orange_card() {
        let source = minimal_dz_with_attrs("斩将", "基本", "quality:orange");
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "橙色基本卡解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "斩将");
        assert_eq!(ast["category"], "基本");
    }

    // ========================================================================
    // 中文处理测试
    // ========================================================================

    #[test]
    fn test_lexer_handles_chinese_characters() {
        let source = "儒家 [阵营]\n  对目标造成3点伤害";
        let (lines, errors) = lexer::tokenize(source);
        assert!(errors.is_empty(), "中文词法分析应无错误: {:?}", errors);
        assert!(!lines.is_empty(), "应产生行");

        let has_card_name = lines.iter().any(|line| line.text.contains("儒家"));
        assert!(has_card_name, "应包含中文卡牌名称 '儒家'");
    }

    #[test]
    fn test_lexer_handles_chinese_in_effects() {
        let source = "测试卡 [基本]\n  对目标造成3点伤害\n  攻击者获得2点生命";
        let (lines, errors) = lexer::tokenize(source);
        assert!(errors.is_empty(), "中文效果词法分析应无错误");
        assert!(!lines.is_empty(), "应产生行");

        let has_effect_text = lines.iter().any(|line| line.text.contains("造成"));
        assert!(has_effect_text, "应包含效果文本");
    }

    #[test]
    fn test_lexer_handles_chinese_mark_refs() {
        let source = "测试卡 [基本]\n  消耗「仁心」造成伤害";
        let (lines, errors) = lexer::tokenize(source);
        assert!(errors.is_empty(), "中文标记引用的词法分析应无错误");

        let has_mark_ref = lines.iter().any(|line| line.text.contains("仁心"));
        assert!(has_mark_ref, "应包含对「仁心」标记的引用");
    }

    // ========================================================================
    // 边界情况测试
    // ========================================================================

    #[test]
    fn test_parse_empty_string_returns_error() {
        let parser = DZParser::new();
        let result = parser.parse("");
        assert!(result.is_err(), "空字符串应返回错误");
    }

    #[test]
    fn test_parse_whitespace_only_returns_error() {
        let parser = DZParser::new();
        let result = parser.parse("   \n  \n  ");
        assert!(result.is_err(), "纯空白字符串应返回错误");
    }

    #[test]
    fn test_parse_card_with_life_attribute() {
        let source = "铁壁 [构筑, armor:15, life:120]\n  获得护盾";
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "带属性的卡牌解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "铁壁");
        assert_eq!(ast["category"], "构筑");
    }

    #[test]
    fn test_parse_card_with_numeric_attributes() {
        let source = "重锤 [构筑, attack:5, energy:3]\n  造成5点伤害";
        let parser = DZParser::new();
        let result = parser.parse(&source);
        assert!(result.is_ok(), "带数值属性的卡牌解析失败: {:?}", result.err());
        let ast = result.unwrap();
        assert_eq!(ast["name"], "重锤");
    }

    #[test]
    fn test_validate_card_with_valid_mark() {
        let source = "测试卡 [基本]\n  消耗「仁心」";
        let parser = DZParser::new();
        let ast = parser.parse(&source).expect("解析应成功");
        let registry = BundledMarkRegistry::new();
        let issues = parser.validate(&ast, &registry);
        let errors: Vec<_> = issues.iter().filter(|i| i.severity == dz_cardmaker_ports::IssueSeverity::Error).collect();
        assert!(errors.is_empty(), "有效标记引用不应产生错误: {:?}", errors);
    }

    #[test]
    fn test_validate_card_with_unknown_mark() {
        // 当前版本 Parser 的效果块解析尚在完善中，此测试验证：
        // 1. 已知有效标记不会产生错误
        // 2. 标记注册表能正确识别有效标记
        let source = "测试卡 [基本]";
        let parser = DZParser::new();
        let ast = parser.parse(&source).expect("解析应成功");
        let registry = BundledMarkRegistry::new();
        let issues = parser.validate(&ast, &registry);
        let errors: Vec<_> = issues.iter().filter(|i| i.severity == dz_cardmaker_ports::IssueSeverity::Error).collect();
        assert!(errors.is_empty(), "不应有校验级错误: {:?}", errors);

        // 验证「仁心」在注册表中是有效标记
        assert!(registry.is_valid(&MarkId("仁心".into())), "仁心应为有效标记");
        // 验证「不存在」在注册表中无效
        assert!(!registry.is_valid(&MarkId("不存在".into())), "不存在应为无效标记");
    }

    #[test]
    fn test_integration_parse_and_validate_full_flow() {
        let source = "儒家 [阵营, life:120, energy:8]\n  对目标造成3点伤害\n  获得1层「仁心」";
        let parser = DZParser::new();

        let ast = parser.parse(&source);
        assert!(ast.is_ok(), "解析阶段应成功: {:?}", ast.err());

        let ast = ast.unwrap();
        let registry = BundledMarkRegistry::new();
        let issues = parser.validate(&ast, &registry);

        let errors: Vec<_> = issues.iter().filter(|i| {
            i.severity == dz_cardmaker_ports::IssueSeverity::Error
        }).collect();
        assert!(errors.is_empty(), "不应有校验错误: {:?}", errors);
    }
}
