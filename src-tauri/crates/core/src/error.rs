// cardmaker-core: error — 统一错误类型

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CoreError {
    NotFound { entity: String, id: String },
    ParseError { card: String, detail: String },
    ValidateError { card: String, detail: String },
    DuelError { detail: String },
    IoError { detail: String },
}

impl std::fmt::Display for CoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CoreError::NotFound { entity, id } => write!(f, "{} not found: {}", entity, id),
            CoreError::ParseError { card, detail } => write!(f, "parse error in '{}': {}", card, detail),
            CoreError::ValidateError { card, detail } => write!(f, "validation error in '{}': {}", card, detail),
            CoreError::DuelError { detail } => write!(f, "duel error: {}", detail),
            CoreError::IoError { detail } => write!(f, "io error: {}", detail),
        }
    }
}