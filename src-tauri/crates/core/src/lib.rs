// cardmaker-core — 全项目共享基础类型
// engine 层和 tools 层均依赖此 crate，core 不依赖任何 engine 层 crate

pub mod card;
pub mod tag;
pub mod error;
pub mod shared;

pub use shared::*;