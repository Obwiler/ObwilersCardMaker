pub use core;

pub mod state;
pub mod effect;
pub mod executor;
pub mod scenario;

use std::sync::Mutex;

use executor::execute_full_round;
use scenario::{init_scenario, list_scenarios, Scenario, ScenarioMatch, CardInfo, count_scenario_matches};
use state::{DuelState, EffectLogEntry};

/// 全局对峙状态（单例）
pub struct DuelManager(pub Mutex<Option<DuelState>>);

impl DuelManager {
    pub fn new() -> Self {
        DuelManager(Mutex::new(None))
    }
}

/// 效果日志暂存
pub struct EffectLogStore(pub Mutex<Vec<EffectLogEntry>>);

impl EffectLogStore {
    pub fn new() -> Self {
        EffectLogStore(Mutex::new(vec![]))
    }
}

// ============ 核心函数（不带 Tauri 属性） ============

/// 初始化对峙
pub fn do_init_duel(
    scenario_id: &str,
    duel_manager: &Mutex<Option<DuelState>>,
    log_store: &Mutex<Vec<EffectLogEntry>>,
) -> Result<DuelState, String> {
    let state = init_scenario(scenario_id)
        .ok_or_else(|| format!("场景 '{}' 不存在", scenario_id))?;

    *duel_manager.lock().map_err(|e| e.to_string())? = Some(state.clone());
    log_store.lock().map_err(|e| e.to_string())?.clear();

    Ok(state)
}

/// 执行一回合
pub fn do_execute_turn(
    duel_manager: &Mutex<Option<DuelState>>,
    log_store: &Mutex<Vec<EffectLogEntry>>,
) -> Result<DuelState, String> {
    let mut guard = duel_manager.lock().map_err(|e| e.to_string())?;
    let state = guard.as_mut().ok_or("请先调用 init_duel 初始化对峙")?;

    let log = execute_full_round(state);
    let mut log_guard = log_store.lock().map_err(|e| e.to_string())?;
    log_guard.extend(log);

    Ok(state.clone())
}

/// 获取当前对峙状态
pub fn do_get_duel_state(
    duel_manager: &Mutex<Option<DuelState>>,
) -> Result<Option<DuelState>, String> {
    duel_manager.lock()
        .map(|guard| guard.clone())
        .map_err(|e| e.to_string())
}

/// 获取效果日志
pub fn do_get_effect_log(
    log_store: &Mutex<Vec<EffectLogEntry>>,
) -> Result<Vec<EffectLogEntry>, String> {
    log_store.lock()
        .map(|guard| guard.clone())
        .map_err(|e| e.to_string())
}

/// 获取所有场景列表
pub fn do_list_duel_scenarios() -> Vec<Scenario> {
    list_scenarios()
}

/// 获取所有场景及当前卡池匹配数（需要传入卡池信息）
pub fn do_list_duel_scenarios_with_matches(card_pool: Vec<CardInfo>) -> Vec<ScenarioMatch> {
    let scenarios = list_scenarios();
    scenarios.iter().map(|s| count_scenario_matches(s, &card_pool)).collect()
}

/// 获取对峙阶段信息（调试用）
pub fn do_get_duel_phase_info() -> Vec<PhaseInfo> {
    vec![
        PhaseInfo { phase: "Preparation".into(), name: "准备阶段".into(), index: 0 },
        PhaseInfo { phase: "FirstPlayerTurn".into(), name: "先手回合".into(), index: 1 },
        PhaseInfo { phase: "SecondPlayerTurn".into(), name: "后手回合".into(), index: 2 },
        PhaseInfo { phase: "Settlement".into(), name: "结算阶段".into(), index: 3 },
        PhaseInfo { phase: "End".into(), name: "结束".into(), index: 4 },
    ]
}

// ============ 辅助类型 ============

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PhaseInfo {
    pub phase: String,
    pub name: String,
    pub index: u8,
}
