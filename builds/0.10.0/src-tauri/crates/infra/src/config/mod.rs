use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use dz_cardmaker_ports::ConfigPort;

pub struct JsonConfigStore {
    config_path: PathBuf,
    data: Mutex<HashMap<String, serde_json::Value>>,
}

impl JsonConfigStore {
    pub fn new(config_path: &Path) -> Self {
        if let Some(parent) = config_path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let data = if config_path.exists() {
            let content = fs::read_to_string(config_path)
                .expect("无法读取配置文件");
            serde_json::from_str(&content).unwrap_or_else(|e| {
                eprintln!("警告: 配置文件解析失败 ({}), 使用空配置", e);
                HashMap::new()
            })
        } else {
            let default: HashMap<String, serde_json::Value> = HashMap::new();
            let json_str = serde_json::to_string_pretty(&default)
                .expect("无法序列化默认配置");
            fs::write(config_path, &json_str)
                .expect("无法写入默认配置文件");
            default
        };

        Self {
            config_path: config_path.to_path_buf(),
            data: Mutex::new(data),
        }
    }

    fn persist(&self, data: &HashMap<String, serde_json::Value>) -> Result<(), String> {
        let json_str = serde_json::to_string_pretty(data)
            .map_err(|e| format!("配置序列化失败: {}", e))?;
        fs::write(&self.config_path, &json_str)
            .map_err(|e| format!("写入配置文件 '{}' 失败: {}", self.config_path.display(), e))
    }
}

impl Default for JsonConfigStore {
    fn default() -> Self {
        Self::new(&PathBuf::from("config.json"))
    }
}

impl ConfigPort for JsonConfigStore {
    fn get(&self, key: &str) -> Option<String> {
        let data = self.data.lock().ok()?;
        data.get(key).and_then(|v| match v {
            serde_json::Value::String(s) => Some(s.clone()),
            other => Some(other.to_string()),
        })
    }

    fn set(&self, key: &str, value: &str) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|e| format!("锁获取失败: {}", e))?;
        data.insert(key.to_string(), serde_json::Value::String(value.to_string()));
        self.persist(&data)
    }

    fn get_json(&self, key: &str) -> Option<serde_json::Value> {
        let data = self.data.lock().ok()?;
        data.get(key).cloned()
    }

    fn set_json(&self, key: &str, value: &serde_json::Value) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|e| format!("锁获取失败: {}", e))?;
        data.insert(key.to_string(), value.clone());
        self.persist(&data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_config_path() -> (PathBuf, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        (path, dir)
    }

    #[test]
    fn test_new_creates_default_file() {
        let (path, _dir) = temp_config_path();
        assert!(!path.exists());

        let _store = JsonConfigStore::new(&path);
        assert!(path.exists());

        let content = fs::read_to_string(&path).unwrap();
        assert_eq!(content.trim(), "{}");
    }

    #[test]
    fn test_set_and_get() {
        let (path, _dir) = temp_config_path();
        let store = JsonConfigStore::new(&path);

        store.set("theme", "dark").unwrap();
        assert_eq!(store.get("theme"), Some("dark".to_string()));
    }

    #[test]
    fn test_get_nonexistent() {
        let (path, _dir) = temp_config_path();
        let store = JsonConfigStore::new(&path);

        assert_eq!(store.get("nonexistent"), None);
    }

    #[test]
    fn test_set_overwrites() {
        let (path, _dir) = temp_config_path();
        let store = JsonConfigStore::new(&path);

        store.set("key", "value1").unwrap();
        store.set("key", "value2").unwrap();
        assert_eq!(store.get("key"), Some("value2".to_string()));
    }

    #[test]
    fn test_persists_to_disk() {
        let (path, _dir) = temp_config_path();
        {
            let store = JsonConfigStore::new(&path);
            store.set("language", "zh-CN").unwrap();
            store.set("volume", "0.8").unwrap();
        }

        let content = fs::read_to_string(&path).unwrap();
        assert!(content.contains("language"));
        assert!(content.contains("zh-CN"));
        assert!(content.contains("volume"));
        assert!(content.contains("0.8"));
    }

    #[test]
    fn test_get_json_and_set_json() {
        let (path, _dir) = temp_config_path();
        let store = JsonConfigStore::new(&path);

        let value = serde_json::json!({"width": 1920, "height": 1080});
        store.set_json("resolution", &value).unwrap();

        let retrieved = store.get_json("resolution");
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap(), value);
    }

    #[test]
    fn test_roundtrip_integer_value() {
        let (path, _dir) = temp_config_path();
        let store = JsonConfigStore::new(&path);

        store.set_json("count", &serde_json::json!(42)).unwrap();
        let v = store.get_json("count").unwrap();
        assert_eq!(v, serde_json::json!(42));
        assert_eq!(store.get("count"), Some("42".to_string()));
    }

    #[test]
    fn test_read_existing_file() {
        let (path, _dir) = temp_config_path();
        let initial = serde_json::json!({"key1": "val1", "key2": "val2"});
        fs::write(&path, serde_json::to_string_pretty(&initial).unwrap()).unwrap();

        let store = JsonConfigStore::new(&path);
        assert_eq!(store.get("key1"), Some("val1".to_string()));
        assert_eq!(store.get("key2"), Some("val2".to_string()));
    }
}
