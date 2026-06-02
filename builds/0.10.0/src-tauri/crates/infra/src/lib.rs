//! DZ CardMaker — 基础设施层
//!
//! L2 层。实现 ports 层的全部 trait，负责文件 IO、解析、渲染、战场等具体技术。

pub mod error;

// 各实现模块——后续阶段逐个实现
pub mod file_repo;
pub mod parser;
pub mod renderer;
pub mod battlefield;
pub mod batch_output;
pub mod ai_assistant;
pub mod asset_loader;
pub mod config;
pub mod logging;
pub mod errors_zh;
