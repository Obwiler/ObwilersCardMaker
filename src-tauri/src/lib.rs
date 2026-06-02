//! CardMaker 胶水层 — 负责将 tag / parser / duel 三个独立 crate 的
//! 纯 Rust 函数包装为 Tauri 命令并注册到同一个 App。
//! 三个 crate 之间零依赖，仅在此处汇聚。

use tauri::Manager;
use duel::{DuelManager, EffectLogStore};
use devtools::{HealthReport, CheckResult, ErrorEntry};
use parser::data_gov::{JsonValidationResult, DuplicatePair, ImportResult};

// ============ 通用 ============

#[tauri::command]
fn greet(name: &str) -> String {
    format!("你好, {}! 欢迎使用 CardMaker 0.9.1", name)
}

// ============ Tag crate 包装器 ============

#[tauri::command]
fn get_tag_by_name(name: String) -> Option<tag::types::Tag> {
    tag::get_tag_by_name(name)
}

#[tauri::command]
fn get_tag_by_id(id: String) -> Option<tag::types::Tag> {
    tag::get_tag_by_id(id)
}

#[tauri::command]
fn list_all_tags() -> Vec<tag::types::Tag> {
    tag::list_all_tags()
}

#[tauri::command]
fn list_all_marks() -> Vec<tag::types::Mark> {
    tag::list_all_marks()
}

// ============ Parser crate 包装器 ============

#[tauri::command]
fn parse_card(name: String, text: String) -> parser::parser::ParseResult {
    parser::parse_card(name, text)
}

#[tauri::command]
fn parse_all_cards() -> Vec<parser::card_data::Card> {
    parser::parse_all_cards()
}

#[tauri::command]
fn validate_all_cards() -> Vec<parser::validator::CardValidation> {
    parser::validate_all_cards()
}

#[tauri::command]
fn parse_stats() -> parser::ParseStats {
    parser::parse_stats()
}

// ============ Parser CRUD ============

#[tauri::command]
fn create_card(name: String, tags: Vec<String>, text: String) -> Result<parser::card_data::Card, String> {
    parser::do_create_card(name, tags, text)
}

#[tauri::command]
fn update_card(id: String, name: Option<String>, tags: Option<Vec<String>>, text: Option<String>) -> Result<parser::card_data::Card, String> {
    parser::do_update_card(id, name, tags, text)
}

#[tauri::command]
fn delete_card(id: String) -> Result<bool, String> {
    parser::do_delete_card(id)
}

#[tauri::command]
fn get_card(id: String) -> Option<parser::card_data::Card> {
    parser::do_get_card(id)
}

#[tauri::command]
fn save_cards(data_dir: Option<String>) -> Result<usize, String> {
    parser::do_save_cards(data_dir)
}

#[tauri::command]
fn load_cards(data_dir: String) -> Result<Vec<parser::card_data::Card>, String> {
    parser::do_load_cards(data_dir)
}

// ============ 数据治理 ============

#[tauri::command]
fn validate_cards() -> JsonValidationResult {
    parser::do_validate_current_cards()
}

#[tauri::command]
fn detect_duplicates() -> Vec<DuplicatePair> {
    parser::do_detect_duplicates()
}

#[tauri::command]
fn export_cards(ids: Vec<String>) -> Result<String, String> {
    parser::do_export_cards(ids)
}

#[tauri::command]
fn import_cards(json_str: String) -> Result<ImportResult, String> {
    parser::do_import_cards(json_str)
}

// ============ Duel crate 包装器 ============

#[tauri::command]
fn init_duel(
    scenario_id: String,
    duel_manager: tauri::State<DuelManager>,
    log_store: tauri::State<EffectLogStore>,
) -> Result<duel::state::DuelState, String> {
    duel::do_init_duel(&scenario_id, &duel_manager.0, &log_store.0)
}

#[tauri::command]
fn execute_turn(
    duel_manager: tauri::State<DuelManager>,
    log_store: tauri::State<EffectLogStore>,
) -> Result<duel::state::DuelState, String> {
    duel::do_execute_turn(&duel_manager.0, &log_store.0)
}

#[tauri::command]
fn get_duel_state(
    duel_manager: tauri::State<DuelManager>,
) -> Result<Option<duel::state::DuelState>, String> {
    duel::do_get_duel_state(&duel_manager.0)
}

#[tauri::command]
fn get_effect_log(
    log_store: tauri::State<EffectLogStore>,
) -> Result<Vec<duel::state::EffectLogEntry>, String> {
    duel::do_get_effect_log(&log_store.0)
}

#[tauri::command]
fn list_duel_scenarios() -> Vec<duel::scenario::Scenario> {
    duel::do_list_duel_scenarios()
}

#[tauri::command]
fn list_duel_scenarios_with_matches(card_pool: Vec<duel::scenario::CardInfo>) -> Vec<duel::scenario::ScenarioMatch> {
    duel::do_list_duel_scenarios_with_matches(card_pool)
}

#[tauri::command]
fn get_duel_phase_info() -> Vec<duel::PhaseInfo> {
    duel::do_get_duel_phase_info()
}

// ============ DevTools ============

#[tauri::command]
fn run_full_health_check() -> HealthReport {
    devtools::full_report()
}

#[tauri::command]
fn run_single_check(name: String) -> CheckResult {
    match name.as_str() {
        "cargo" => devtools::check_cargo(),
        "tsc" => devtools::check_tsc(),
        "fmt" => devtools::check_fmt(),
        "clippy" => devtools::check_clippy(),
        "frontend" => devtools::build_frontend(),
        s if s.starts_with("test:") => devtools::test_crate(&s[5..]),
        _ => CheckResult {
            name: format!("unknown check: {}", name),
            passed: false,
            duration_ms: 0,
            stdout: String::new(),
            stderr: "unknown check name".into(),
            exit_code: None,
        },
    }
}

// ─── 错题集 ──────────────────────────────────

#[tauri::command]
fn get_error_log() -> Vec<ErrorEntry> {
    devtools::read_error_log()
}

#[tauri::command]
fn clear_error_log() -> bool {
    devtools::clear_error_log();
    true
}

#[tauri::command]
fn get_error_summary() -> Vec<(String, usize)> {
    devtools::error_summary()
}

// ============ 入口 ============

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(DuelManager::new())
        .manage(EffectLogStore::new())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_tag_by_name,
            get_tag_by_id,
            list_all_tags,
            list_all_marks,
            parse_card,
            parse_all_cards,
            validate_all_cards,
            parse_stats,
            create_card,
            update_card,
            delete_card,
            get_card,
            save_cards,
            load_cards,
            validate_cards,
            detect_duplicates,
            export_cards,
            import_cards,
            init_duel,
            execute_turn,
            get_duel_state,
            get_effect_log,
            list_duel_scenarios,
            list_duel_scenarios_with_matches,
            get_duel_phase_info,
            run_full_health_check,
            run_single_check,
            get_error_log,
            clear_error_log,
            get_error_summary,
        ])
        .setup(|app| {
            // 使用 Tauri 的 app_data_dir 作为存储根目录（开发/生产一致）
            let app_data_dir = app.path().app_data_dir()
                .expect("无法获取应用数据目录");
            std::fs::create_dir_all(&app_data_dir)
                .expect("无法创建应用数据目录");

            // 注入数据目录到 parser crate
            parser::card_data::set_data_dir(app_data_dir.clone());

            // 加载卡牌数据（首运行自动从编译期嵌入数据播种）
            let dir_str = app_data_dir.to_str().unwrap_or(".");
            match parser::card_data::init_cards(dir_str) {
                Ok(count) => eprintln!("[CardMaker] 已加载 {} 张卡牌", count),
                Err(e) => eprintln!("[CardMaker] 卡牌加载失败: {}", e),
            }

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();

                // 启动时自动校验 cards.json 数据完整性
                let validation = parser::do_validate_current_cards();
                if !validation.valid {
                    eprintln!(
                        "[CardMaker] 卡牌数据校验未通过 ({} 张卡牌，{} 个错误)",
                        validation.total_cards,
                        validation.errors.len()
                    );
                    for err in &validation.errors {
                        eprintln!("  - {} [{}].{}: {}", err.card_name, err.card_id, err.field, err.message);
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("无法启动应用");
}
