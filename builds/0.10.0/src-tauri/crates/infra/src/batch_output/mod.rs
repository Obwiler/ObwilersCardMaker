//! 批量产出器 — 配比表→Parser→Renderer→SVG 序列
//!
//! 编排 ParserPort + RenderPort + 文件 IO，将整个卡集批量渲染为 SVG 文件。
//! 同时生成 manifest.json 索引。

use std::fs;
use std::path::{Path, PathBuf};
use dz_cardmaker_ports::*;

pub struct BatchRenderer {
    cards_dir: PathBuf,
}

impl BatchRenderer {
    pub fn new(cards_dir: &Path) -> Self {
        Self { cards_dir: cards_dir.to_path_buf() }
    }
}

impl BatchOutputPort for BatchRenderer {
    fn generate_set(
        &self,
        set_name: &str,
        target_dir: &Path,
        scale: f32,
        progress: Option<&dyn ProgressCallback>,
    ) -> Result<BatchOutputResult, String> {
        let mut total = 0u32;
        let mut generated = 0u32;
        let mut failed = Vec::new();
        let mut manifest_entries = Vec::new();

        // 创建输出目录
        let output_dir = target_dir.join(set_name);
        fs::create_dir_all(&output_dir)
            .map_err(|e| format!("创建输出目录失败: {}", e))?;

        // 读取配比表
        let dist_path = self.cards_dir.join("_distribution.json");
        let dist_json = fs::read_to_string(&dist_path)
            .map_err(|e| format!("读取配比表失败: {}", e))?;
        let dist_json = dist_json.trim_start_matches('\u{feff}');

        let parsed: serde_json::Value = serde_json::from_str(dist_json)
            .map_err(|e| format!("解析配比表: {}", e))?;
        let entries = parsed["entries"].as_array()
            .ok_or("配比表缺少 entries 数组")?;

        total = entries.len() as u32;

        // 初始化 Parser 和 Renderer
        let parser = crate::parser::DZParser::new();
        let renderer = crate::renderer::CanvasRenderer::new();

        for (i, entry) in entries.iter().enumerate() {
            let id_str = entry["id"].as_str().unwrap_or("unknown");
            let name = entry["name"].as_str().unwrap_or("unknown");
            let category = entry["category"].as_str().unwrap_or("");
            let id = StaticCardId(id_str.to_string());

            // 查找 card.dz
            let card_dir = find_card_dir(&self.cards_dir, &id);
            if card_dir.is_none() {
                failed.push(format!("{}: 目录不存在", id.0));
                continue;
            }
            let card_dir = card_dir.unwrap();

            let source_path = card_dir.join("card.dz");
            let source = match fs::read_to_string(&source_path) {
                Ok(s) => s,
                Err(e) => {
                    failed.push(format!("{}: 读取card.dz失败: {}", id.0, e));
                    continue;
                }
            };

            // 解析
            let ast = match parser.parse(&source) {
                Ok(a) => a,
                Err(e) => {
                    failed.push(format!("{}: 解析失败 L{}: {}", id.0, e.line, e.message));
                    continue;
                }
            };

            // 构建 meta（从 AST 提取属性）
            let bundle = CardBundle {
                meta: CardMeta {
                    id: id.clone(),
                    name: name.to_string(),
                    category: category.to_string(),
                    attributes: serde_json::Value::Null,
                    version: "0.10.0".into(),
                },
                source,
                ast,
            };

            let svg_bytes = match renderer.render_card(&bundle, scale) {
                Ok(b) => b,
                Err(e) => {
                    failed.push(format!("{}: 渲染失败: {}", id.0, e));
                    continue;
                }
            };

            // 写入 SVG
            let out_name = format!("{}_{}.svg", id_str, name);
            let out_path = output_dir.join(&out_name);
            if let Err(e) = fs::write(&out_path, &svg_bytes) {
                failed.push(format!("{}: 写入失败: {}", id.0, e));
                continue;
            }

            generated += 1;
            manifest_entries.push(serde_json::json!({
                "id": id_str,
                "name": name,
                "category": category,
                "file": out_name,
                "size_bytes": svg_bytes.len(),
            }));

            // 进度回调
            if let Some(cb) = progress {
                cb.on_progress((i + 1) as u32, total, &format!("{}/{} {} {}", i + 1, total, id_str, name));
            }
        }

        // 生成 manifest.json
        let manifest = serde_json::json!({
            "set_name": set_name,
            "version": "0.10.0",
            "total_cards": total,
            "generated": generated,
            "scale": scale,
            "entries": manifest_entries,
        });
        let manifest_path = output_dir.join("manifest.json");
        let manifest_str = serde_json::to_string_pretty(&manifest)
            .map_err(|e| format!("序列化 manifest: {}", e))?;
        fs::write(&manifest_path, &manifest_str)
            .map_err(|e| format!("写入 manifest: {}", e))?;

        Ok(BatchOutputResult {
            total_cards: total,
            cards_generated: generated,
            failed,
            manifest_path,
            output_dir,
        })
    }
}

// ============================================================================
// 辅助
// ============================================================================

fn find_card_dir(cards_dir: &Path, id: &StaticCardId) -> Option<PathBuf> {
    let entries = fs::read_dir(cards_dir).ok()?;
    for entry in entries.filter_map(|e| e.ok()) {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if name_str.starts_with(&id.0) {
            return Some(entry.path());
        }
    }
    None
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_batch_renderer_creates_output() {
        let tmp = tempfile::TempDir::new().unwrap();
        // Create minimal cards dir with distribution
        let cards_dir = tmp.path().join("cards");
        fs::create_dir_all(&cards_dir).unwrap();

        // Minimal distribution.json
        let dist = serde_json::json!({
            "entries": [
                {"id": "JB01", "name": "击敌", "category": "基本牌", "count": 3}
            ]
        });
        fs::write(cards_dir.join("_distribution.json"),
            serde_json::to_string_pretty(&dist).unwrap()).unwrap();

        // card.dz
        let card_dir = cards_dir.join("JB01-击敌");
        fs::create_dir_all(&card_dir).unwrap();
        fs::write(card_dir.join("card.dz"), "击敌 [基本牌, 白]\n  对目标造成1点物理伤害。").unwrap();

        let renderer = BatchRenderer::new(&cards_dir);
        let out = tmp.path().join("output");
        let result = renderer.generate_set("test_set", &out, 1.0, None).unwrap();

        assert_eq!(result.total_cards, 1);
        assert_eq!(result.cards_generated, 1);
        assert!(result.failed.is_empty());
        assert!(result.output_dir.join("JB01_击敌.svg").exists());
        assert!(result.manifest_path.exists());
    }

    #[test]
    fn test_batch_renderer_handles_missing_card() {
        let tmp = tempfile::TempDir::new().unwrap();
        let cards_dir = tmp.path().join("cards");
        fs::create_dir_all(&cards_dir).unwrap();

        let dist = serde_json::json!({
            "entries": [
                {"id": "XX99", "name": "不存在", "category": "基本牌", "count": 1}
            ]
        });
        fs::write(cards_dir.join("_distribution.json"),
            serde_json::to_string_pretty(&dist).unwrap()).unwrap();

        let renderer = BatchRenderer::new(&cards_dir);
        let out = tmp.path().join("output");
        let result = renderer.generate_set("test_set", &out, 1.0, None).unwrap();

        assert_eq!(result.cards_generated, 0);
        assert_eq!(result.failed.len(), 1);
    }
}
