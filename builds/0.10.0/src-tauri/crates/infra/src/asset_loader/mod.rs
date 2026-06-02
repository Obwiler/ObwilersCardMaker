use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use dz_cardmaker_ports::{AssetLoaderPort, StaticCardId};

struct CacheEntry {
    data: Vec<u8>,
    size: usize,
}

struct CacheInner {
    entries: HashMap<String, CacheEntry>,
    order: Vec<String>,
    total_size: usize,
}

pub struct FsAssetLoader {
    cards_dir: PathBuf,
    assets_dir: PathBuf,
    cache_limit: usize,
    cache: Mutex<CacheInner>,
}

impl FsAssetLoader {
    pub fn new(cards_dir: &Path, assets_dir: &Path) -> Self {
        Self {
            cards_dir: cards_dir.to_path_buf(),
            assets_dir: assets_dir.to_path_buf(),
            cache_limit: 32 * 1024 * 1024,
            cache: Mutex::new(CacheInner {
                entries: HashMap::new(),
                order: Vec::new(),
                total_size: 0,
            }),
        }
    }

    pub fn with_cache_limit(mut self, limit_bytes: usize) -> Self {
        self.cache_limit = limit_bytes;
        self
    }

    fn resolve_card_dir(&self, card_id: &StaticCardId) -> Result<PathBuf, String> {
        let read_dir = fs::read_dir(&self.cards_dir)
            .map_err(|e| format!("无法读取卡牌目录 '{}': {}", self.cards_dir.display(), e))?;

        for entry in read_dir {
            let entry = entry.map_err(|e| format!("读取目录条目失败: {}", e))?;
            let file_name = entry.file_name();
            let name_str = file_name.to_string_lossy();
            if name_str.starts_with(&card_id.0) && entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                return Ok(entry.path());
            }
        }

        Err(format!("未找到卡牌 '{}' 对应的目录", card_id.0))
    }

    fn load_bytes(&self, path: &Path) -> Result<Vec<u8>, String> {
        fs::read(path).map_err(|e| format!("读取文件 '{}' 失败: {}", path.display(), e))
    }

    fn cache_key_shared(keyword: &str) -> String {
        format!("shared:{}", keyword)
    }

    fn cache_key_card(card_id: &StaticCardId, asset_name: &str) -> String {
        format!("card:{}:{}", card_id.0, asset_name)
    }

    fn cache_get(&self, key: &str) -> Option<Vec<u8>> {
        let mut inner = self.cache.lock().ok()?;
        if let Some(entry) = inner.entries.get(key) {
            let data = entry.data.clone();
            if let Some(pos) = inner.order.iter().position(|k| k == key) {
                inner.order.remove(pos);
                inner.order.push(key.to_string());
            }
            Some(data)
        } else {
            None
        }
    }

    fn cache_insert(&self, key: String, data: Vec<u8>) {
        let size = data.len();
        if size > self.cache_limit {
            return;
        }

        let mut inner = match self.cache.lock() {
            Ok(guard) => guard,
            Err(_) => return,
        };

        if inner.entries.contains_key(&key) {
            if let Some(old) = inner.entries.get(&key) {
                inner.total_size = inner.total_size.saturating_sub(old.size);
            }
            inner.order.retain(|k| k != &key);
        }

        while inner.total_size + size > self.cache_limit && !inner.order.is_empty() {
            let evict_key = inner.order.remove(0);
            if let Some(evicted) = inner.entries.remove(&evict_key) {
                inner.total_size = inner.total_size.saturating_sub(evicted.size);
            }
        }

        inner.total_size += size;
        inner.order.push(key.clone());
        inner.entries.insert(key, CacheEntry { data, size });
    }

    fn try_load_shared_subdirs(&self, keyword: &str) -> Result<Vec<u8>, String> {
        let sub_dirs = ["icons", "bg", "fonts", "tokens"];
        for sub in &sub_dirs {
            let candidate = self.assets_dir.join("shared").join(sub).join(keyword);
            if candidate.exists() && candidate.is_file() {
                return self.load_bytes(&candidate);
            }
        }
        Err(format!("在 shared 子目录中未找到素材 '{}'", keyword))
    }
}

impl Default for FsAssetLoader {
    fn default() -> Self {
        Self::new(&PathBuf::from("cards"), &PathBuf::from("assets"))
    }
}

impl AssetLoaderPort for FsAssetLoader {
    fn load_shared(&self, keyword: &str) -> Result<Vec<u8>, String> {
        let cache_key = Self::cache_key_shared(keyword);

        if let Some(cached) = self.cache_get(&cache_key) {
            return Ok(cached);
        }

        let exact = self.assets_dir.join("shared").join(keyword);
        if exact.exists() && exact.is_file() {
            let data = self.load_bytes(&exact)?;
            self.cache_insert(cache_key, data.clone());
            return Ok(data);
        }

        let data = self.try_load_shared_subdirs(keyword)?;
        self.cache_insert(cache_key, data.clone());
        Ok(data)
    }

    fn load_card_asset(&self, card_id: &StaticCardId, asset_name: &str) -> Result<Vec<u8>, String> {
        let cache_key = Self::cache_key_card(card_id, asset_name);

        if let Some(cached) = self.cache_get(&cache_key) {
            return Ok(cached);
        }

        let card_dir = self.resolve_card_dir(card_id)?;
        let asset_path = card_dir.join("assets").join(asset_name);

        if !asset_path.exists() || !asset_path.is_file() {
            return Err(format!(
                "卡牌 '{}' 的素材 '{}' 不存在 (路径: {})",
                card_id.0,
                asset_name,
                asset_path.display()
            ));
        }

        let data = self.load_bytes(&asset_path)?;
        self.cache_insert(cache_key, data.clone());
        Ok(data)
    }

    fn evict_card_cache(&self, card_id: &StaticCardId) {
        let prefix = format!("card:{}:", card_id.0);

        if let Ok(mut inner) = self.cache.lock() {
            let keys_to_remove: Vec<String> = inner
                .entries
                .keys()
                .filter(|k| k.starts_with(&prefix))
                .cloned()
                .collect();

            for key in &keys_to_remove {
                if let Some(entry) = inner.entries.remove(key) {
                    inner.total_size = inner.total_size.saturating_sub(entry.size);
                }
            }

            inner.order.retain(|k| !keys_to_remove.contains(k));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn setup_test_env() -> (tempfile::TempDir, StaticCardId) {
        let dir = tempfile::tempdir().unwrap();
        let assets_dir = dir.path().join("assets");
        let cards_dir = dir.path().join("cards");
        fs::create_dir_all(&assets_dir).unwrap();
        fs::create_dir_all(&cards_dir).unwrap();
        (dir, StaticCardId("test-card-001".to_string()))
    }

    #[test]
    fn test_load_shared_exact() {
        let (dir, _) = setup_test_env();
        let assets_dir = dir.path().join("assets");
        fs::create_dir_all(&assets_dir.join("shared")).unwrap();
        let mut f = fs::File::create(assets_dir.join("shared").join("logo.png")).unwrap();
        f.write_all(b"fake-png-data").unwrap();

        let loader = FsAssetLoader::new(&dir.path().join("cards"), &assets_dir);
        let result = loader.load_shared("logo.png");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), b"fake-png-data");
    }

    #[test]
    fn test_load_shared_subdir() {
        let (dir, _) = setup_test_env();
        let assets_dir = dir.path().join("assets");
        fs::create_dir_all(&assets_dir.join("shared").join("icons")).unwrap();
        let mut f = fs::File::create(assets_dir.join("shared").join("icons").join("sword.svg")).unwrap();
        f.write_all(b"<svg/>").unwrap();

        let loader = FsAssetLoader::new(&dir.path().join("cards"), &assets_dir);
        let result = loader.load_shared("sword.svg");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), b"<svg/>");
    }

    #[test]
    fn test_load_shared_not_found() {
        let (dir, _) = setup_test_env();
        let assets_dir = dir.path().join("assets");
        fs::create_dir_all(&assets_dir.join("shared")).unwrap();

        let loader = FsAssetLoader::new(&dir.path().join("cards"), &assets_dir);
        let result = loader.load_shared("nonexistent.png");
        assert!(result.is_err());
    }

    #[test]
    fn test_load_card_asset() {
        let (dir, card_id) = setup_test_env();
        let card_dir = dir.path().join("cards").join("test-card-001-测试");
        fs::create_dir_all(&card_dir.join("assets")).unwrap();
        let mut f = fs::File::create(card_dir.join("assets").join("face.png")).unwrap();
        f.write_all(b"card-face-data").unwrap();

        let loader = FsAssetLoader::new(&dir.path().join("cards"), &dir.path().join("assets"));
        let result = loader.load_card_asset(&card_id, "face.png");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), b"card-face-data");
    }

    #[test]
    fn test_load_card_asset_not_found() {
        let (dir, card_id) = setup_test_env();
        let card_dir = dir.path().join("cards").join("test-card-001-测试");
        fs::create_dir_all(&card_dir).unwrap();

        let loader = FsAssetLoader::new(&dir.path().join("cards"), &dir.path().join("assets"));
        let result = loader.load_card_asset(&card_id, "missing.png");
        assert!(result.is_err());
    }

    #[test]
    fn test_evict_card_cache() {
        let (dir, card_id) = setup_test_env();
        let card_dir = dir.path().join("cards").join("test-card-001-测试");
        fs::create_dir_all(&card_dir.join("assets")).unwrap();
        let mut f = fs::File::create(card_dir.join("assets").join("face.png")).unwrap();
        f.write_all(b"card-face-data").unwrap();

        let loader = FsAssetLoader::new(&dir.path().join("cards"), &dir.path().join("assets"));
        let _ = loader.load_card_asset(&card_id, "face.png");

        {
            let inner = loader.cache.lock().unwrap();
            assert!(!inner.entries.is_empty());
        }

        loader.evict_card_cache(&card_id);

        {
            let inner = loader.cache.lock().unwrap();
            assert!(inner.entries.is_empty());
            assert_eq!(inner.total_size, 0);
        }
    }

    #[test]
    fn test_cache_limit() {
        let (dir, card_id) = setup_test_env();
        let card_dir = dir.path().join("cards").join("test-card-001-测试");
        fs::create_dir_all(&card_dir.join("assets")).unwrap();
        let mut f = fs::File::create(card_dir.join("assets").join("face.png")).unwrap();
        f.write_all(b"small-data").unwrap();

        let loader = FsAssetLoader::new(&dir.path().join("cards"), &dir.path().join("assets"))
            .with_cache_limit(5);

        let result = loader.load_card_asset(&card_id, "face.png");
        assert!(result.is_ok());

        {
            let inner = loader.cache.lock().unwrap();
            assert!(inner.entries.is_empty());
            assert_eq!(inner.total_size, 0);
        }
    }
}
