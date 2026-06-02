//! 中文错误信息模板 — 提供用户友好的中文错误提示
//!
//! 将 parser/validator/battlefield 中的错误 ID 映射为中文消息。
//! 前端可通过 this.getErrorMessage() 获取中文版。

use dz_cardmaker_ports::{ParseError, ValidationIssue, IssueSeverity};

/// 格式化解析错误为中文
pub fn format_parse_error(err: &ParseError) -> String {
    match err.message.as_str() {
        msg if msg.contains("空文本") => "请至少输入一张卡牌的定义。".into(),
        msg if msg.contains("缺少类型") => format!("第{}行：卡牌定义缺少 [类型标记]。\n正确写法：`卡名 [类型, 属性]`", err.line),
        msg if msg.contains("名称") && msg.contains("缺少") => format!("第{}行：卡牌缺少名称，请检查声明行。", err.line),
        _ => format!("第{}行第{}列：{}", err.line, err.col, err.message),
    }
}

/// 格式化校验问题为中文
pub fn format_validation_issue(issue: &ValidationIssue) -> String {
    let rule_desc = match issue.rule_id {
        1 => "效果文本缺少谓语动词".into(),
        2 => "备注中包含了条件判断，请改用独立分支行表达".into(),
        3 => "备注中包含了分支效果，请拆为独立条目".into(),
        4 => "一行内出现了主语切换，请拆分为多行书写".into(),
        5 => "缩进层级不连续，请使用2空格的整数倍缩进".into(),
        6 => "使用了非标准的谓语动词，建议使用系统词表中的动词".into(),
        7 => "引用了未定义的标记名".into(),
        8 => "使用了非标准的条件词".into(),
        9 => "卡牌定义缺少名称或类型标记".into(),
        10 => "效果文本缺少谓语动词，可能是书写不完整".into(),
        11 => "标记名称存在多个别名，请统一命名".into(),
        _ => format!("未知规则(#{}): {}", issue.rule_id, issue.message),
    };

    let sev = match issue.severity {
        IssueSeverity::Error => "⚠️ 错误".to_string(),
        IssueSeverity::Warning => " 警告".to_string(),
    };

    format!("【{sev}】{rule_desc}\n  详情：{}", issue.message)
}

/// 格式化战场操作为中文
pub fn format_battlefield_log(action: &str, card_id: &str, result: &str) -> String {
    match action {
        "init_game" => format!("对局开始：{}", result),
        "draw_card" => format!("{} 抽牌", card_id),
        "play_card" => format!("{} 打出", card_id),
        "伤害" => format!("{} {}", card_id, result),
        "支付" => format!("支付：{}", result),
        "恢复" => format!("恢复：{}", result),
        "获得护甲" => format!("护甲提升：{}", result),
        "移除护甲" => format!("护甲移除：{}", result),
        "扣除技力" => format!("技力扣除：{}", result),
        "移除标记" => format!("标记移除：{}", result),
        "获得标记" => format!("标记获得：{}", result),
        "抽牌" => format!("抽牌：{}", result),
        "弃牌" => format!("弃牌：{}", result),
        "伤害免疫" => format!("伤害被免疫：{}", result),
        _ => format!("{}: {}", action, result),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_source_message() {
        let err = ParseError { line: 1, col: 0, message: "空文本".into(), severity: IssueSeverity::Error };
        let msg = format_parse_error(&err);
        assert!(msg.contains("至少输入一张"));
    }

    #[test]
    fn test_missing_bracket_message() {
        let err = ParseError { line: 3, col: 0, message: "缺少类型声明 [...]".into(), severity: IssueSeverity::Error };
        let msg = format_parse_error(&err);
        assert!(msg.contains("第3行"));
        assert!(msg.contains("[类型标记]"));
    }

    #[test]
    fn test_rule_2_warning_chinese() {
        let issue = ValidationIssue {
            rule_id: 2,
            message: "备注含条件".into(),
            severity: IssueSeverity::Error,
        };
        let msg = format_validation_issue(&issue);
        assert!(msg.contains("条件判断"));
        assert!(msg.contains("⚠️"));
    }

    #[test]
    fn test_battlefield_damage_log() {
        let msg = format_battlefield_log("伤害", "JB01_1", "3 点伤害 (物理)");
        assert!(msg.contains("JB01_1"));
        assert!(msg.contains("3 点伤害"));
    }
}
