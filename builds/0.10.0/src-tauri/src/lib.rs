//! DZ CardMaker — Tauri 命令路由（薄胶水层）
//!
//! 每条命令只做三件事：获取 Port → 调用用例 → 返回结果。
//! 所有 Port 实现通过全局 OnceLock 惰性初始化。

use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use dz_cardmaker_ports::*;
use dz_cardmaker_infra as infra;

// ============================================================================
// 全局服务注册表（每端口一个 OnceLock）
// ============================================================================

type Repo = Mutex<infra::file_repo::FileCardRepository>;
type Parser = infra::parser::DZParser;
type Marks = infra::parser::BundledMarkRegistry;
type Bf = Mutex<infra::battlefield::BattlefieldModule>;
type Duel = Mutex<infra::battlefield::DuelEngine>;
type Render = infra::renderer::CanvasRenderer;

static REPO: OnceLock<Repo> = OnceLock::new();
static PARSER: OnceLock<Parser> = OnceLock::new();
static MARKS: OnceLock<Marks> = OnceLock::new();
static BATTLEFIELD: OnceLock<Bf> = OnceLock::new();
static DUEL: OnceLock<Duel> = OnceLock::new();
static RENDERER: OnceLock<Render> = OnceLock::new();
static BATCH: OnceLock<infra::batch_output::BatchRenderer> = OnceLock::new();

fn cards_dir() -> PathBuf {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")).join("cards")
}

fn repo() -> &'static Repo { REPO.get_or_init(|| Mutex::new(infra::file_repo::FileCardRepository::new(&cards_dir()))) }
fn parser() -> &'static Parser { PARSER.get_or_init(infra::parser::DZParser::new) }
fn marks() -> &'static Marks { MARKS.get_or_init(infra::parser::BundledMarkRegistry::new) }
fn battlefield() -> &'static Bf { BATTLEFIELD.get_or_init(|| Mutex::new(infra::battlefield::BattlefieldModule::new())) }
fn duel() -> &'static Duel { DUEL.get_or_init(|| Mutex::new(infra::battlefield::DuelEngine::new())) }
fn renderer() -> &'static Render { RENDERER.get_or_init(infra::renderer::CanvasRenderer::new) }
fn batch() -> &'static infra::batch_output::BatchRenderer { BATCH.get_or_init(|| infra::batch_output::BatchRenderer::new(&cards_dir())) }

// ============================================================================
// Tauri 命令
// ============================================================================

#[tauri::command]
fn list_cards() -> Result<Vec<String>, String> {
    repo().lock().unwrap().list_all().map(|ids| ids.into_iter().map(|id| id.0).collect())
}

#[tauri::command]
fn load_card(card_id: String) -> Result<CardBundle, String> {
    repo().lock().unwrap().load(&StaticCardId(card_id))
}

#[tauri::command]
fn save_card(card_id: String, source: String) -> Result<(), String> {
    let id = StaticCardId(card_id.clone());
    let meta = CardMeta { id: id.clone(), name: card_id, category: "custom".into(), attributes: serde_json::Value::Null, version: "0.10.0".into() };
    repo().lock().unwrap().save(&id, &source, &meta)
}

#[tauri::command]
fn delete_card(card_id: String) -> Result<(), String> {
    repo().lock().unwrap().delete(&StaticCardId(card_id))
}

#[tauri::command]
fn parse_dz(source: String) -> Result<String, String> {
    let ast = parser().parse(&source).map_err(|e| e.message)?;
    Ok(serde_json::to_string_pretty(&ast).unwrap_or_default())
}

#[tauri::command]
fn validate_dz(source: String) -> Result<Vec<String>, String> {
    let ast = parser().parse(&source).map_err(|e| e.message)?;
    let issues = parser().validate(&ast, marks());
    Ok(issues.into_iter().map(|i| i.message).collect())
}

#[tauri::command]
fn render_preview(card_id: String, scale: f32) -> Result<Vec<u8>, String> {
    let bundle = repo().lock().unwrap().load(&StaticCardId(card_id))?;
    renderer().render_card(&bundle, scale)
}

#[tauri::command]
fn batch_export(set_name: String) -> Result<String, String> {
    use std::path::PathBuf;
    let target = PathBuf::from("output");
    let result = batch().generate_set(&set_name, &target, 1.0, None)?;
    Ok(format!("导出完成: {}/{}, 失败 {} 张, 输出: {}",
        result.cards_generated, result.total_cards,
        result.failed.len(),
        result.output_dir.display()))
}

#[tauri::command]
fn draw_card(player_id: String) -> Result<String, String> {
    let card = battlefield().lock().unwrap().draw_card(PlayerId(player_id))?;
    Ok(card.0)
}

#[tauri::command]
fn get_player_hand(player_id: String) -> Result<Vec<String>, String> {
    let pid = PlayerId(player_id);
    Ok(battlefield().lock().unwrap().get_player_hand_ids(&pid))
}

#[tauri::command]
fn get_player_field(player_id: String) -> Result<Vec<String>, String> {
    let pid = PlayerId(player_id);
    Ok(battlefield().lock().unwrap().get_player_field_ids(&pid))
}

#[tauri::command]
fn get_player_deck_size(player_id: String) -> Result<usize, String> {
    let pid = PlayerId(player_id);
    Ok(battlefield().lock().unwrap().player_deck_size(&pid))
}

#[tauri::command]
fn get_current_turn() -> Result<u32, String> {
    Ok(battlefield().lock().unwrap().current_turn())
}

#[tauri::command]
fn init_duel(player_count: u32) -> Result<(), String> {
    duel().lock().unwrap().init_duel(player_count)
}

#[tauri::command]
fn play_card(player_id: String, card_id: String, target: Option<String>) -> Result<String, String> {
    battlefield().lock().unwrap().play_card(
        PlayerId(player_id),
        RuntimeCardId(card_id),
        target.map(PlayerId),
    ).map(|_| "成功".into())
}

#[tauri::command]
fn get_battlefield_state(player_id: String) -> Result<String, String> {
    let hand = battlefield().lock().unwrap().get_player_hand(PlayerId(player_id));
    Ok(serde_json::to_string_pretty(&hand).unwrap_or_default())
}

// ============================================================================

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            list_cards, load_card, save_card, delete_card,
            parse_dz, validate_dz,
            render_preview, batch_export,
            init_duel, draw_card, play_card,
            get_player_hand, get_player_field,
            get_player_deck_size, get_battlefield_state,
            get_current_turn,
        ])
        .run(tauri::generate_context!())
        .expect("DZ CardMaker 启动失败");
}
