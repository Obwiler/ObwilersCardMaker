use thiserror::Error;

/// DZ CardMaker 统一错误类型
#[derive(Error, Debug)]
pub enum CardMakerError {
    #[error("卡牌 `{0}` 不存在")]
    CardNotFound(String),

    #[error("解析失败：第{line}行第{col}列 — {msg}")]
    ParseFailed { line: usize, col: usize, msg: String },

    #[error("校验未通过：{0}")]
    ValidationFailed(String),

    #[error("IO 错误：{0}")]
    Io(#[from] std::io::Error),

    #[error("JSON 错误：{0}")]
    Json(#[from] serde_json::Error),

    #[error("战场错误：{0}")]
    Battlefield(String),

    #[error("内部错误：{0}")]
    Internal(String),
}

pub type Result<T> = std::result::Result<T, CardMakerError>;
