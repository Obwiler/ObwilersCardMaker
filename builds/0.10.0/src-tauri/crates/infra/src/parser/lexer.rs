//! DZ 词法分析器（精简版）
//!
//! 将 DZ 源文本按行解析为带缩进信息的 Line 结构。
//! 分词逻辑由 parser 直接完成——DZ 语法是行级别结构。

use dz_cardmaker_ports::ParseError;

#[derive(Debug, Clone)]
pub struct Line {
    pub indent: usize,
    pub text: String,
    pub line_no: usize,
}

pub fn tokenize(source: &str) -> (Vec<Line>, Vec<ParseError>) {
    let mut lines = Vec::new();

    for (line_no, raw) in source.lines().enumerate() {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            continue;
        }
        let indent = raw.chars().take_while(|c| *c == ' ').count();
        lines.push(Line {
            indent,
            text: trimmed.to_string(),
            line_no: line_no + 1,
        });
    }

    (lines, Vec::new())
}
