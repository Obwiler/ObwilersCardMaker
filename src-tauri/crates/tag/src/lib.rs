pub use core;

pub mod types;
pub mod data;

use data::{MARKS, TAGS};
use types::{Mark, Tag};

/// 按名称查询标签
pub fn get_tag_by_name(name: String) -> Option<Tag> {
    TAGS.values().find(|t| t.name == name).cloned()
}

/// 按 ID 查询标签
pub fn get_tag_by_id(id: String) -> Option<Tag> {
    TAGS.get(&id).cloned()
}

/// 列出所有标签
pub fn list_all_tags() -> Vec<Tag> {
    TAGS.values().cloned().collect()
}

/// 列出所有标记
pub fn list_all_marks() -> Vec<Mark> {
    MARKS.clone()
}
