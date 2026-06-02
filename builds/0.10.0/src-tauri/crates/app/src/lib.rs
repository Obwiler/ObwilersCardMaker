//! DZ CardMaker — 应用层（用例编排）
//!
//! L4 层。将多个 Port 协作完成业务流程。不自己实现领域逻辑。

use dz_cardmaker_ports::*;

/// 加载所有卡牌列表
pub fn list_cards(repo: &dyn CardRepositoryPort) -> Result<Vec<String>, String> {
    repo.list_all().map(|ids| {
        ids.into_iter().map(|id| id.0).collect()
    })
}

/// 加载单张卡牌的完整数据
pub fn load_card(
    repo: &dyn CardRepositoryPort,
    id: &StaticCardId,
) -> Result<CardBundle, String> {
    repo.load(id)
}

/// 解析一段 DZ 文本并返回 AST
pub fn parse_dz_text(
    parser: &dyn ParserPort,
    source: &str,
    mark_registry: &dyn MarkRegistryPort,
) -> Result<(serde_json::Value, Vec<ValidationIssue>), String> {
    let ast = parser.parse(source).map_err(|e| format!("解析失败: {}", e.message))?;
    let issues = parser.validate(&ast, mark_registry);
    Ok((ast, issues))
}

/// 渲染一张卡牌为 PNG 数据
pub fn render_card_png(
    repo: &dyn CardRepositoryPort,
    renderer: &dyn RenderPort,
    id: &StaticCardId,
    scale: f32,
) -> Result<Vec<u8>, String> {
    let bundle = repo.load(id)?;
    renderer.render_card(&bundle, scale)
}

/// 删除一张卡牌及其目录
pub fn delete_card(
    repo: &dyn CardRepositoryPort,
    id: &StaticCardId,
) -> Result<(), String> {
    repo.delete(id)
}

/// 批量产出整个套牌的卡面
pub fn batch_export_set(
    batch: &dyn BatchOutputPort,
    set_name: &str,
    target_dir: &std::path::Path,
) -> Result<BatchOutputResult, String> {
    batch.generate_set(set_name, target_dir, 3.0, None)
}
