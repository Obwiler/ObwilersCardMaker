//! 分层卡面渲染引擎 — 7 层合成 SVG 管线
//!
//! 层序（标准卡牌 300×420 坐标系）：
//!
//!   Layer 1 — 背景层         (色底 + 圆角裁剪)         #1a1a2e 底色
//!   Layer 2 — 卡框层         (边框 + 品质色带)         白/蓝/紫/橙边
//!   Layer 3 — 卡名/类型层    (名称 + 子类型标签)       左上角标题
//!   Layer 4 — 属性栏层       (生命/护甲/技力 数值)    左上角属性条
//!   Layer 5 — 效果文本层     (DZ 效果线 × N)          主体区域 居中排版
//!   Layer 6 — 标记/状态层    (标记图标 + 备注约束)     效果行内嵌
//!   Layer 7 — 叠层/版权层    (版本水印 + 版权)         右下角小字
//!
//! 坐标系：
//!   width  = 300 × scale
//!   height = 420 × scale
//!   margin = 16 × scale
//!   name_x/y = margin          (卡名位置)
//!   attr_y   = name_y + 24     (属性栏位置)
//!   text_y   = attr_y + 40     (效果文本起始)
//!   line_h   = 18 × scale      (行高)
//!   watermark = bottom_right   (水印)

use dz_cardmaker_ports::{CardBundle, RenderPort};
use serde_json::Value as Json;

pub struct CanvasRenderer;

impl CanvasRenderer {
    pub fn new() -> Self { Self }
}

impl Default for CanvasRenderer {
    fn default() -> Self { Self::new() }
}

// ============================================================================
// 公开渲染接口
// ============================================================================

impl RenderPort for CanvasRenderer {
    fn render_card(&self, bundle: &CardBundle, scale: f32) -> Result<Vec<u8>, String> {
        let w = (300.0 * scale) as u32;
        let h = (420.0 * scale) as u32;
        let s = scale;

        let ast = &bundle.ast;
        let category = bundle.meta.category.as_str();
        let attrs = &bundle.meta.attributes;

        let mut svg = String::with_capacity(4096);
        svg_open(&mut svg, w, h);

        // ── Layer 1: 背景 ──
        layer_background(&mut svg, w, h, category);

        // ── Layer 2: 卡框 + 品质色带 ──
        let quality = extract_quality(attrs).unwrap_or("common");
        layer_frame(&mut svg, w, h, s, quality);

        // ── Layer 3: 卡名 + 类型标签 ──
        layer_title(&mut svg, s, &bundle.meta.name, category, attrs);

        // ── Layer 4: 属性栏 ──
        layer_attrs(&mut svg, s, attrs);

        // ── Layer 5: 效果文本 ──
        layer_effects(&mut svg, s, w, ast);

        // ── Layer 6: 标记/备注（内嵌在 Layer 5 中已处理）──
        // ── Layer 7: 水印 ──
        layer_watermark(&mut svg, w, h, s, &bundle.meta.version);

        svg_close(&mut svg);
        Ok(svg.into_bytes())
    }

    fn render_preview(&self, ast: &Json, _template: &str) -> Result<Vec<u8>, String> {
        let w = 300u32; let h = 420u32; let s = 1.0f32;
        let mut svg = String::with_capacity(2048);
        svg_open(&mut svg, w, h);
        layer_background(&mut svg, w, h, "预览");
        layer_frame(&mut svg, w, h, s, "common");
        layer_effects(&mut svg, s, w, ast);
        svg_close(&mut svg);
        Ok(svg.into_bytes())
    }
}

// ============================================================================
// Layer 1 — 背景
// ============================================================================

fn layer_background(svg: &mut String, w: u32, h: u32, category: &str) {
    let bg = match category {
        "阵营" | "阵营卡" => "#16213e",
        "职业" | "职业卡" => "#1a1a2e",
        "兵刃" => "#2e1a1a",
        "宝器" => "#2e2e1a",
        "甲胄" => "#1a2e1a",
        "武学" => "#1a1a3e",
        "术法" => "#2e1a3e",
        "基本牌" => "#1e1e2e",
        _ => "#1a1a2e",
    };
    push(svg, &format!(
        "<rect width=\"{w}\" height=\"{h}\" fill=\"{bg}\" rx=\"10\" ry=\"10\"/>",
    ));
}

// ============================================================================
// Layer 2 — 卡框 + 品质色带
// ============================================================================

fn layer_frame(svg: &mut String, w: u32, h: u32, s: f32, quality: &str) {
    let color = match quality {
        "白" | "white"   => "#e8e8e8",
        "蓝" | "blue"    => "#4a90d9",
        "紫" | "purple"  => "#9b59b6",
        "橙" | "orange"  => "#e67e22",
        _                => "#666666",
    };
    let tw = (4.0 * s) as u32;
    push(svg, &format!(
        "<rect x=\"1\" y=\"1\" width=\"{w}\" height=\"{h}\" \
         fill=\"none\" stroke=\"{color}\" stroke-width=\"{tw}\" rx=\"10\" ry=\"10\"/>",
    ));
    // 品质色带（顶部装饰条）
    push(svg, &format!(
        "<path d=\"M10,{band_y} h{w2}\" stroke=\"{color}\" stroke-width=\"{bw}\" opacity=\"0.6\"/>",
        band_y = (12.0 * s) as u32,
        w2 = w - 20,
        bw = (3.0 * s) as u32,
    ));
}

// ============================================================================
// Layer 3 — 卡名 + 类型标签
// ============================================================================

fn layer_title(svg: &mut String, s: f32, name: &str, category: &str, _attrs: &Json) {
    let fs = (18.0 * s) as u32;
    let x = (18.0 * s) as u32;
    let y = (34.0 * s) as u32;

    push(svg, &format!(
        "<text x=\"{x}\" y=\"{y}\" fill=\"#f0f0f0\" font-size=\"{fs}\" \
         font-family=\"sans-serif\" font-weight=\"bold\">{name}</text>",
    ));

    // 类型标签（小标签在卡名旁边）
    let tag_x = x + (name_len_px(name, s) as u32) + (8.0 * s) as u32;
    let tag_ry = (22.0 * s) as u32;
    let tag_fs = (10.0 * s) as u32;
    let tag_w = (category.len() as f32 * 10.0 * s) as u32 + (6.0 * s) as u32;
    let tag_h = (14.0 * s) as u32;
    push(svg, &format!(
        "<rect x=\"{tag_x}\" y=\"{tag_ry}\" width=\"{tag_w}\" height=\"{tag_h}\" \
         fill=\"#333\" rx=\"3\"/>",
    ));
    push(svg, &format!(
        "<text x=\"{tx}\" y=\"{ty}\" fill=\"#aaa\" font-size=\"{tag_fs}\" \
         font-family=\"sans-serif\">{category}</text>",
        tx = tag_x + (3.0 * s) as u32,
        ty = tag_ry + (10.0 * s) as u32,
    ));
}

fn name_len_px(name: &str, s: f32) -> f32 {
    name.chars().count() as f32 * 13.0 * s
}

// ============================================================================
// Layer 4 — 属性栏
// ============================================================================

fn layer_attrs(svg: &mut String, s: f32, attrs: &Json) {
    let life  = attrs["生命"].as_i64().unwrap_or(0);
    let armor = attrs["护甲"].as_i64().unwrap_or(0);
    let energy= attrs["技力"].as_i64().unwrap_or(0);

    if life + armor + energy == 0 { return; }

    let x = (18.0 * s) as u32;
    let y = (56.0 * s) as u32;
    let fs = (11.0 * s) as u32;
    let gap = (60.0 * s) as u32;

    let items = [
        ("❤", life, "#e74c3c"),
        ("🛡", armor, "#3498db"),
        ("⚡", energy, "#f1c40f"),
    ];
    for (i, (icon, val, color)) in items.iter().enumerate() {
        if *val > 0 {
            push(svg, &format!(
                "<text x=\"{}\" y=\"{y}\" fill=\"{color}\" font-size=\"{fs}\" \
                 font-family=\"sans-serif\">{icon} {val}</text>",
                x + (i as u32 * gap),
            ));
        }
    }
}

// ============================================================================
// Layer 5 — 效果文本
// ============================================================================

fn layer_effects(svg: &mut String, s: f32, _card_w: u32, ast: &Json) {
    let start_x = (18.0 * s) as u32;
    let mut y = (82.0 * s) as u32;
    let fs = (11.0 * s) as u32;
    let lh = (20.0 * s) as u32;

    // 效果区域背景
    let panel_w = (264.0 * s) as u32;
    let panel_h = (300.0 * s) as u32;
    let py = y - (2.0 * s) as u32;
    push(svg, &format!(
        "<rect x=\"{}\" y=\"{py}\" width=\"{panel_w}\" height=\"{panel_h}\" \
         fill=\"#ffffff08\" rx=\"4\"/>",
        (start_x as i32 - 2).max(0),
    ));

    push(svg, &format!(
        "<text x=\"{start_x}\" y=\"{y}\" fill=\"#ccc\" font-size=\"{fs}\" \
         font-family=\"sans-serif\">—— 效果 ——</text>",
    ));
    y += lh + (8.0 * s) as u32;

    // 遍历 AST 输出效果行
    if let Some(effects) = ast["effects"].as_array() {
        for block in effects {
            match block["type"].as_str() {
                Some("core_skill") => {
                    let skill = block["skill_name"].as_str().unwrap_or("核心技能");
                    push(svg, &format!(
                        "<text x=\"{start_x}\" y=\"{y}\" fill=\"#e0c060\" font-size=\"{fs}\" \
                         font-weight=\"bold\">核心技能：{skill}</text>"
                    ));
                    y += lh;
                    render_entries(svg, &block["entries"], start_x, &mut y, fs, lh);
                }
                Some("trigger_block") => {
                    let trigger = block["trigger"].as_str().unwrap_or("");
                    let display = if trigger.len() > 28 {
                        format!("{}…", &trigger[..trigger.len().min(28)])
                    } else {
                        trigger.to_string()
                    };
                    push(svg, &format!(
                        "<text x=\"{start_x}\" y=\"{y}\" fill=\"#a0c0e0\" font-size=\"{fs}\">{display}</text>"
                    ));
                    y += lh;
                    render_entries(svg, &block["entries"], start_x + (8.0 * s) as u32, &mut y, fs, lh);
                }
                Some("multi_option") => {
                    let block_name = block["block_name"].as_str().unwrap_or("");
                    push(svg, &format!(
                        "<text x=\"{start_x}\" y=\"{y}\" fill=\"#c0a0e0\" font-size=\"{fs}\">{block_name}：</text>"
                    ));
                    y += lh;
                    for opt in block["options"].as_array().unwrap_or(&vec![]) {
                        let text = opt["text"].as_str().unwrap_or("");
                        let rem  = opt["remark"].as_str().unwrap_or("");
                        push(svg, &format!(
                            "<text x=\"{ox}\" y=\"{y}\" fill=\"#999\" font-size=\"{fs}\">· {text}{rem}</text>",
                            ox = start_x + (16.0 * s) as u32,
                        ));
                        y += lh;
                    }
                }
                Some("default_block") => {
                    render_entries(svg, &block["entries"], start_x, &mut y, fs, lh);
                }
                _ => {}
            }
        }
    }
}

fn render_entries(svg: &mut String, entries: &Json, x: u32, y: &mut u32, fs: u32, lh: u32) {
    let arr = match entries.as_array() {
        Some(a) => a,
        None => return,
    };
    for entry in arr {
        let etype = entry["type"].as_str().unwrap_or("simple");
        match etype {
            "simple" | "constant" => {
                let text = entry["text"].as_str().unwrap_or("");
                let remark = entry["remark"].as_str().unwrap_or("");
                let display = format!("{}{}{}",
                    if etype == "constant" { "— " } else { "" },
                    trancate_text(text, 32),
                    remark
                );
                push(svg, &format!(
                    "<text x=\"{x}\" y=\"{y}\" fill=\"#bbb\" font-size=\"{fs}\">{display}</text>"
                ));
                *y += lh;
            }
            "branch" => {
                let cond = entry["condition"].as_str().unwrap_or("");
                push(svg, &format!(
                    "<text x=\"{x}\" y=\"{y}\" fill=\"#d09040\" font-size=\"{fs}\">？ {cond}</text>"
                ));
                *y += lh;
                render_entries(svg, &entry["entries"], x + (16u32), y, fs - 1, lh);
            }
            "trigger_block" => {
                let trigger = entry["trigger"].as_str().unwrap_or("");
                push(svg, &format!(
                    "<text x=\"{x}\" y=\"{y}\" fill=\"#a0c0e0\" font-size=\"{fs}\">{trigger}</text>"
                ));
                *y += lh;
                render_entries(svg, &entry["entries"], x + (8u32), y, fs, lh);
            }
            _ => {}
        }
    }
}

fn trancate_text(text: &str, max: usize) -> String {
    let count = text.chars().count();
    if count <= max { text.to_string() }
    else {
        let truncated: String = text.chars().take(max).collect();
        format!("{}…", truncated)
    }
}

// ============================================================================
// Layer 7 — 水印
// ============================================================================

fn layer_watermark(svg: &mut String, w: u32, h: u32, s: f32, version: &str) {
    let fs = (8.0 * s) as u32;
    let x = (w as i32 - (80.0 * s) as i32).max(0) as u32;
    let y = (h as i32 - (12.0 * s) as i32).max(0) as u32;

    push(svg, &format!(
        "<text x=\"{x}\" y=\"{y}\" fill=\"#444\" font-size=\"{fs}\" \
         font-family=\"monospace\" text-anchor=\"end\">v{version}</text>",
    ));
    push(svg, &format!(
        "<text x=\"{x}\" y=\"{y2}\" fill=\"#333\" font-size=\"{sf}\" \
         font-family=\"monospace\" text-anchor=\"end\">DZ CardMaker</text>",
        y2 = (y as i32 - 14).max(0) as u32,
        sf = (7.0 * s) as u32,
    ));
}

// ============================================================================
// 辅助
// ============================================================================

fn svg_open(svg: &mut String, w: u32, h: u32) {
    push(svg, &format!(
        "<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' \
         viewBox='0 0 {w} {h}'>"
    ));
}

fn svg_close(svg: &mut String) {
    push(svg, "</svg>");
}

fn push(svg: &mut String, line: &str) {
    svg.push_str(line);
    svg.push('\n');
}

fn extract_quality(attrs: &Json) -> Option<&str> {
    if attrs["白"] == true || attrs["white"] == true { return Some("白"); }
    if attrs["蓝"] == true || attrs["blue"] == true { return Some("蓝"); }
    if attrs["紫"] == true || attrs["purple"] == true { return Some("紫"); }
    if attrs["橙"] == true || attrs["orange"] == true { return Some("橙"); }
    attrs["quality"].as_str()
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use dz_cardmaker_ports::{CardMeta, StaticCardId};

    #[test]
    fn test_render_card_returns_bytes() {
        let bundle = CardBundle {
            meta: CardMeta {
                id: StaticCardId("JB01".into()),
                name: "击敌".into(),
                category: "基本牌".into(),
                attributes: serde_json::json!({"白": true}),
                version: "0.10.0".into(),
            },
            source: "击敌 [基本牌, 白]\n  对目标造成1点物理伤害。".into(),
            ast: serde_json::json!({}),
        };
        let r = CanvasRenderer;
        let bytes = r.render_card(&bundle, 1.0).unwrap();
        assert!(!bytes.is_empty());
        let svg = String::from_utf8(bytes).unwrap();
        assert!(svg.contains("<svg"));
        assert!(svg.contains("击敌"));
    }

    #[test]
    fn test_render_card_respects_scale() {
        let bundle = CardBundle {
            meta: CardMeta {
                id: StaticCardId("JB01".into()),
                name: "击敌".into(),
                category: "基本牌".into(),
                attributes: serde_json::json!({"白": true}),
                version: "0.10.0".into(),
            },
            source: "".into(),
            ast: serde_json::json!({}),
        };
        let r = CanvasRenderer;
        let bytes = r.render_card(&bundle, 2.0).unwrap();
        let svg = String::from_utf8(bytes).unwrap();
        assert!(svg.contains("width='600'"));
        assert!(svg.contains("height='840'"));
    }

    #[test]
    fn test_render_preview_returns_bytes() {
        let r = CanvasRenderer;
        let ast = serde_json::json!({"effects": [{"type": "default_block", "entries": [
            {"type": "simple", "text": "对目标造成1点物理伤害。", "remark": "", "mark_refs": []}
        ]}]});
        let bytes = r.render_preview(&ast, "test").unwrap();
        assert!(!bytes.is_empty());
    }

    #[test]
    fn test_render_preview_empty_ast() {
        let r = CanvasRenderer;
        let ast = serde_json::json!({});
        let bytes = r.render_preview(&ast, "test").unwrap();
        assert!(!bytes.is_empty());
    }
}
