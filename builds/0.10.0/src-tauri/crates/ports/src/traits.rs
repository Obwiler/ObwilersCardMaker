//! DZ CardMaker — 全部 Port trait 接口定义
//!
//! 本文件是七层架构的契约层。所有 trait 定义在此，实现方在 infra crate。
//! 模块之间只见 trait，不见实现。

use std::path::{Path, PathBuf};

// ============================================================================
// 前置：共享类型（这些是接口需要的通用类型，放在 ports crate 中）
// ============================================================================

#[derive(Debug, Clone, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct CardId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct StaticCardId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct RuntimeCardId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct MarkId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct PlayerId(pub String);

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum Zone {
    Deck,
    Hand,
    Field,
    Graveyard,
    Exile,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum Phase {
    Draw,
    Main,
    Combat,
    End,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RuntimeCardInstance {
    pub runtime_id: RuntimeCardId,
    pub static_def_ref: StaticCardId,
    pub zone: Zone,
    pub owner: PlayerId,
    pub hp: u32,
    pub armor: u32,
    pub energy: u32,
    pub marks: std::collections::HashMap<MarkId, u32>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CardBundle {
    pub meta: CardMeta,
    pub source: String,
    pub ast: serde_json::Value,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CardMeta {
    pub id: StaticCardId,
    pub name: String,
    pub category: String,
    pub attributes: serde_json::Value,
    pub version: String,
}

#[derive(Debug, Clone)]
pub struct ParseError {
    pub line: usize,
    pub col: usize,
    pub message: String,
    pub severity: IssueSeverity,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IssueSeverity {
    Error,
    Warning,
}

#[derive(Debug, Clone)]
pub struct ValidationIssue {
    pub rule_id: u32,
    pub message: String,
    pub severity: IssueSeverity,
}

#[derive(Debug, Clone)]
pub struct EffectResult {
    pub success: bool,
    pub log: Vec<LogEntry>,
    pub state_changes: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LogEntry {
    pub turn: u32,
    pub action: String,
    pub actor: Option<String>,
    pub target: Option<String>,
    pub result: String,
}

#[derive(Debug, Clone)]
pub struct BatchOutputResult {
    pub total_cards: u32,
    pub cards_generated: u32,
    pub failed: Vec<String>,
    pub manifest_path: PathBuf,
    pub output_dir: PathBuf,
}

#[derive(Debug, Clone)]
pub struct AIContext {
    pub lexicon: String,
    pub grammar_spec: String,
    pub existing_cards_summary: Vec<String>,
    pub distribution_rules: String,
}

#[derive(Debug, Clone)]
pub struct AIGeneratedCard {
    pub dz_text: String,
    pub warnings: Vec<String>,
    pub retry_count: u32,
}

#[derive(Debug, Clone)]
pub struct CompletionSuggestion {
    pub text: String,
    pub display: String,
    pub category: String,
}

pub trait ProgressCallback: Send + Sync {
    fn on_progress(&self, current: u32, total: u32, current_card: &str);
}

// ============================================================================
// 11 个 Port trait 定义
// ============================================================================

/// 卡牌仓库 — 静态卡牌定义的 CRUD
pub trait CardRepositoryPort: Send + Sync {
    fn list_all(&self) -> Result<Vec<StaticCardId>, String>;
    fn load(&self, id: &StaticCardId) -> Result<CardBundle, String>;
    fn save(&self, id: &StaticCardId, source: &str, meta: &CardMeta) -> Result<(), String>;
    fn delete(&self, id: &StaticCardId) -> Result<(), String>;
    fn exists(&self, id: &StaticCardId) -> bool;
}

/// 标记注册表 — 只读查询，不存状态
pub trait MarkRegistryPort: Send + Sync {
    fn list_all(&self) -> Vec<MarkId>;
    fn get_type(&self, id: &MarkId) -> Option<String>;
    fn is_valid(&self, id: &MarkId) -> bool;
}

/// DZ 语法解析器
pub trait ParserPort: Send + Sync {
    fn parse(&self, source: &str) -> Result<serde_json::Value, ParseError>;
    fn validate(&self, ast: &serde_json::Value, mark_registry: &dyn MarkRegistryPort) -> Vec<ValidationIssue>;
}

/// 卡面渲染引擎
pub trait RenderPort: Send + Sync {
    fn render_card(&self, bundle: &CardBundle, scale: f32) -> Result<Vec<u8>, String>;
    fn render_preview(&self, ast: &serde_json::Value, template: &str) -> Result<Vec<u8>, String>;
}

/// 素材加载器 — 关键词 → 文件路径 → 二进制数据
pub trait AssetLoaderPort: Send + Sync {
    fn load_shared(&self, keyword: &str) -> Result<Vec<u8>, String>;
    fn load_card_asset(&self, card_id: &StaticCardId, asset_name: &str) -> Result<Vec<u8>, String>;
    fn evict_card_cache(&self, card_id: &StaticCardId);
}

/// 全局配置读写
pub trait ConfigPort: Send + Sync {
    fn get(&self, key: &str) -> Option<String>;
    fn set(&self, key: &str, value: &str) -> Result<(), String>;
    fn get_json(&self, key: &str) -> Option<serde_json::Value>;
    fn set_json(&self, key: &str, value: &serde_json::Value) -> Result<(), String>;
}

/// 诊断日志
pub trait LogPort: Send + Sync {
    fn info(&self, msg: &str);
    fn warn(&self, msg: &str);
    fn error(&self, msg: &str);
    fn record_parse_error(&self, card_id: &StaticCardId, errors: &[ParseError]);
    fn get_recent_errors(&self, limit: usize) -> Vec<String>;
}

/// 批量产出器 — 配比表 → PNG 序列
pub trait BatchOutputPort: Send + Sync {
    fn generate_set(
        &self,
        set_name: &str,
        target_dir: &Path,
        scale: f32,
        progress: Option<&dyn ProgressCallback>,
    ) -> Result<BatchOutputResult, String>;
}

/// AI 辅助
pub trait AIAssistantPort: Send + Sync {
    fn generate_card(
        &self,
        prompt: &str,
        context: &AIContext,
    ) -> Result<AIGeneratedCard, String>;

    fn validate_and_fix(
        &self,
        dz_text: &str,
        errors: &[ParseError],
    ) -> Result<String, String>;

    fn suggest_completion(
        &self,
        partial_dz: &str,
        cursor_position: usize,
    ) -> Result<Vec<CompletionSuggestion>, String>;
}

/// 战场——运行时实例管理（唯一有权写状态的 Port）
pub trait BattlefieldPort: Send + Sync {
    fn init_game(&mut self, player_count: u32) -> Result<(), String>;
    fn get_player_hand(&self, player: PlayerId) -> Vec<RuntimeCardInstance>;
    fn get_player_field(&self, player: PlayerId) -> Vec<RuntimeCardInstance>;
    fn draw_card(&mut self, player: PlayerId) -> Result<RuntimeCardId, String>;
    fn play_card(
        &mut self,
        player: PlayerId,
        card: RuntimeCardId,
        target: Option<PlayerId>,
    ) -> Result<EffectResult, String>;
    fn get_turn(&self) -> u32;
    fn get_phase(&self) -> Phase;
    fn save_snapshot(&self, path: &Path) -> Result<(), String>;
    fn load_snapshot(&mut self, path: &Path) -> Result<(), String>;
}

/// 对战规则引擎
pub trait DuelEnginePort: Send + Sync {
    fn init_duel(&mut self, player_count: u32) -> Result<(), String>;
    fn start_turn(&mut self, player: PlayerId) -> Result<(), String>;
    fn end_turn(&mut self, player: PlayerId) -> Result<(), String>;
    fn check_win_condition(&self) -> Option<PlayerId>;
    fn get_effect_log(&self) -> Vec<LogEntry>;
}
