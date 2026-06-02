pub mod lexer;
pub mod parser;
pub mod validator;
pub mod mark_registry;

pub use mark_registry::BundledMarkRegistry;

use dz_cardmaker_ports::*;
use self::parser::parse_lines;

pub struct DZParser;

impl DZParser {
    pub fn new() -> Self { Self }
}

impl ParserPort for DZParser {
    fn parse(&self, source: &str) -> Result<serde_json::Value, ParseError> {
        let (lines, errors) = lexer::tokenize(source);
        if let Some(e) = errors.into_iter().next() {
            return Err(e);
        }
        parse_lines(&lines)
    }

    fn validate(
        &self,
        ast: &serde_json::Value,
        mark_registry: &dyn MarkRegistryPort,
    ) -> Vec<ValidationIssue> {
        validator::validate(ast, mark_registry)
    }
}

impl Default for DZParser {
    fn default() -> Self { Self::new() }
}
