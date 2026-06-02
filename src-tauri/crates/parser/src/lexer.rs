//! 词法分析器 - 逐字符扫描卡牌文本，产出 Token 流

use std::iter::Peekable;
use std::str::Chars;

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq)]
pub enum Token {
    Arrow,                // →
    Newline,
    Pipe,                 // |
    Dash,                 // —
    Colon,                // ： or :
    Comma,                // ， or ,
    LParen,               // （
    RParen,               // ）
    LBook,                // 《
    RBook,                // 》
    LBracket,             // [
    RBracket,             // ]
    Equals,               // =
    Plus,                 // +
    Times,                // ×
    Gt,                   // >
    Lt,                   // <
    Hash,                 // #
    Number(String),
    Text(String),
    BlankLine,
    EOF,
}

pub struct Lexer<'a> {
    chars: Peekable<Chars<'a>>,
    cur: Option<char>,
}

impl<'a> Lexer<'a> {
    pub fn new(input: &'a str) -> Self {
        let mut chars = input.chars().peekable();
        Lexer { cur: chars.next(), chars }
    }

    fn advance(&mut self) { self.cur = self.chars.next(); }
    fn ch(&self) -> Option<char> { self.cur }
    fn peek_next(&mut self) -> Option<char> { self.chars.peek().copied() }

    fn skip_ws(&mut self) {
        while let Some(c) = self.ch() {
            if c == ' ' || c == '\r' || c == '\t' { self.advance(); } else { break; }
        }
    }

    fn read_digits(&mut self, first: char) -> String {
        let mut s = String::new();
        s.push(first);
        self.advance();
        while let Some(c) = self.peek_next() {
            if c.is_ascii_digit() || c == '.' { s.push(c); self.advance(); } else { break; }
        }
        s
    }

    fn read_text(&mut self) -> String {
        let stop: &[char] = &[
            '\n','\u{2192}','[',']','：',':', '，',',','|','\u{2014}',
            '（','）','《','》','=','+','×','>','<','#',
        ];
        let mut s = String::new();
        while let Some(c) = self.ch() {
            if stop.contains(&c) { break; }
            s.push(c); self.advance();
        }
        s
    }
}

impl<'a> Iterator for Lexer<'a> {
    type Item = Token;
    fn next(&mut self) -> Option<Self::Item> {
        self.skip_ws();
        match self.ch()? {
            '\n' => {
                self.advance(); self.skip_ws();
                if self.ch() == Some('\n') { self.advance(); return Some(Token::BlankLine); }
                Some(Token::Newline)
            }
            '\u{2192}' => { self.advance(); self.skip_ws(); Some(Token::Arrow) }
            '-' => {
                self.advance();
                if self.ch() == Some('>') { self.advance(); self.skip_ws(); Some(Token::Arrow) }
                else { let mut t = String::from("-"); t.push_str(&self.read_text()); Some(Token::Text(t)) }
            }
            '\u{2014}' => { self.advance(); Some(Token::Dash) }
            '|' => { self.advance(); Some(Token::Pipe) }
            '[' => { self.advance(); Some(Token::LBracket) }
            ']' => { self.advance(); Some(Token::RBracket) }
            '：' => { self.advance(); Some(Token::Colon) }
            ':' => { self.advance(); Some(Token::Colon) }
            '，' => { self.advance(); Some(Token::Comma) }
            ',' => { self.advance(); Some(Token::Comma) }
            '（' => { self.advance(); Some(Token::LParen) }
            '）' => { self.advance(); Some(Token::RParen) }
            '《' => { self.advance(); Some(Token::LBook) }
            '》' => { self.advance(); Some(Token::RBook) }
            '=' => { self.advance(); Some(Token::Equals) }
            '+' => { self.advance(); Some(Token::Plus) }
            '×' => { self.advance(); Some(Token::Times) }
            '>' => { self.advance(); Some(Token::Gt) }
            '<' => { self.advance(); Some(Token::Lt) }
            '#' => { self.advance(); Some(Token::Hash) }
            c if c.is_ascii_digit() => { let n = self.read_digits(c); Some(Token::Number(n)) }
            _ => {
                let t = self.read_text();
                if t.is_empty() { self.advance(); Some(Token::Text(self.ch().unwrap().to_string())) }
                else { Some(Token::Text(t)) }
            }
        }
    }
}

pub fn tokenize(input: &str) -> Vec<Token> { Lexer::new(input).collect() }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_arrow_count() {
        let t = tokenize("消耗1 → 自身 → 造成 → 目标 → 备注");
        assert_eq!(t.iter().filter(|x| matches!(x, Token::Arrow)).count(), 4);
    }

    #[test]
    fn test_brackets() {
        let t = tokenize("[韬光养晦]");
        assert!(matches!(t[0], Token::LBracket));
        assert!(matches!(t[2], Token::RBracket));
    }

    #[test]
    fn test_tag_def() {
        let t = tokenize("[韬光养晦]定义：");
        assert!(matches!(t[0], Token::LBracket));
    }

    #[test]
    fn test_empty_input() {
        let t = tokenize("");
        assert!(t.is_empty());
    }

    #[test]
    fn test_only_whitespace() {
        let t = tokenize("   \n  \n  ");
        assert!(t.is_empty() || t.iter().all(|tok| matches!(tok, Token::Newline)));
    }

    #[test]
    fn test_single_text_token() {
        let t = tokenize("测试");
        assert_eq!(t.len(), 1);
        assert!(matches!(&t[0], Token::Text(s) if s == "测试"));
    }

    #[test]
    fn test_mixed_text_and_arrows() {
        let t = tokenize("消耗1 → 自身 → 造成 → 1点伤害");
        let arrows = t.iter().filter(|tok| matches!(tok, Token::Arrow)).count();
        assert_eq!(arrows, 3);
    }

    #[test]
    fn test_unicode_full_width_parens() {
        let t = tokenize("（额外）");
        let lparen = t.iter().filter(|tok| matches!(tok, Token::LParen)).count();
        let rparen = t.iter().filter(|tok| matches!(tok, Token::RParen)).count();
        assert_eq!(lparen, 1);
        assert_eq!(rparen, 1);
    }

    #[test]
    fn test_number_token() {
        let t = tokenize("造成3点伤害");
        let has_number = t.iter().any(|tok| matches!(tok, Token::Number(3)));
        assert!(has_number);
    }

    #[test]
    fn test_dash_token() {
        let t = tokenize("—");
        assert!(matches!(&t[0], Token::Dash));
    }

    #[test]
    fn test_double_arrow() {
        let t = tokenize("--> →");
        let arrows = t.iter().filter(|tok| matches!(tok, Token::Arrow)).count();
        assert_eq!(arrows, 2);
    }
}
