//! 文件系统卡牌仓库 — 实现 CardRepositoryPort
//!
//! 从 cards/ 目录遍历卡片文件夹，读取 card.dz + meta.json

pub mod degradation;

use std::fs;
use std::path::{Path, PathBuf};
use dz_cardmaker_ports::*;

pub struct FileCardRepository {
    cards_dir: PathBuf,
}

impl FileCardRepository {
    pub fn new(cards_dir: &Path) -> Self {
        Self {
            cards_dir: cards_dir.to_path_buf(),
        }
    }

    fn card_dir(&self, id: &StaticCardId) -> Option<PathBuf> {
        let entries = fs::read_dir(&self.cards_dir).ok()?;
        for entry in entries.filter_map(|e| e.ok()) {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            if name_str.starts_with(&id.0) {
                return Some(entry.path());
            }
        }
        None
    }

    fn read_file(&self, dir: &Path, filename: &str) -> Result<String, String> {
        let path = dir.join(filename);
        fs::read_to_string(&path)
            .map_err(|e| format!("读取 {} 失败: {}", path.display(), e))
    }

    fn write_file(&self, dir: &Path, filename: &str, content: &str) -> Result<(), String> {
        let path = dir.join(filename);
        fs::create_dir_all(dir).map_err(|e| format!("创建目录失败: {}", e))?;
        fs::write(&path, content)
            .map_err(|e| format!("写入 {} 失败: {}", path.display(), e))
    }
}

impl CardRepositoryPort for FileCardRepository {
    fn list_all(&self) -> Result<Vec<StaticCardId>, String> {
        let mut ids = Vec::new();
        let entries = fs::read_dir(&self.cards_dir)
            .map_err(|e| format!("遍历 cards/ 目录失败: {}", e))?;

        for entry in entries.filter_map(|e| e.ok()) {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            if let Some(id_part) = name_str.split('-').next() {
                let full_id = id_part.to_string();
                if full_id.chars().next().map_or(false, |c| c.is_ascii_uppercase()) {
                    ids.push(StaticCardId(full_id));
                }
            }
        }

        Ok(ids)
    }

    fn load(&self, id: &StaticCardId) -> Result<CardBundle, String> {
        let dir = self.card_dir(id)
            .ok_or_else(|| format!("卡牌 {} 的目录不存在", id.0))?;

        let source = self.read_file(&dir, "card.dz")?;
        let meta_raw = self.read_file(&dir, "meta.json")?;

        let meta: CardMeta = serde_json::from_str(&meta_raw)
            .map_err(|e| format!("解析 meta.json 失败: {}", e))?;

        Ok(CardBundle {
            meta,
            source,
            ast: serde_json::Value::Null,
        })
    }

    fn save(&self, id: &StaticCardId, source: &str, meta: &CardMeta) -> Result<(), String> {
        let dir = self.card_dir(id)
            .ok_or_else(|| format!("卡牌 {} 的目录不存在", id.0))?;

        self.write_file(&dir, "card.dz", source)?;

        let meta_json = serde_json::to_string_pretty(meta)
            .map_err(|e| format!("序列化 meta 失败: {}", e))?;
        self.write_file(&dir, "meta.json", &meta_json)?;

        Ok(())
    }

    fn delete(&self, id: &StaticCardId) -> Result<(), String> {
        let dir = self.card_dir(id)
            .ok_or_else(|| format!("卡牌 {} 的目录不存在", id.0))?;
        fs::remove_dir_all(&dir)
            .map_err(|e| format!("删除 {} 失败: {}", dir.display(), e))
    }

    fn exists(&self, id: &StaticCardId) -> bool {
        self.card_dir(id).is_some()
    }
}
