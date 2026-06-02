//! 战场模块 — 运行时实例管理 + 对战引擎
//!
//! L0 运行时层。唯一有写状态的模块。
//! 实现 BattlefieldPort 和 DuelEnginePort。
//!
//! 子模块：
//!   factory        → 配比表→160实例→洗牌分配
//!   zones          → 5区域状态迁移 + 合法性校验
//!   effect_engine  → 支付→结算→连锁 三段式结算
//!   effect_stack   → LIFO 嵌套效果栈
//!   duel_engine    → 对战规则引擎 (已有)

pub mod duel_engine;
pub mod factory;
pub mod zones;
pub mod effect_engine;
pub mod effect_stack;
pub mod setup;

pub use duel_engine::DuelEngine;

use std::collections::HashMap;
use std::path::Path;
use dz_cardmaker_ports::*;
use self::effect_stack::EffectStack;

pub struct BattlefieldModule {
    players: Vec<PlayerData>,
    instances: HashMap<RuntimeCardId, RuntimeCardInstance>,
    turn: u32,
    phase: Phase,
    effect_log: Vec<LogEntry>,
    effect_stack: EffectStack,
}

pub struct PlayerData {
    pub id: PlayerId,
    pub hand: Vec<RuntimeCardId>,
    pub field: Vec<RuntimeCardId>,
    pub deck: Vec<RuntimeCardId>,
    pub graveyard: Vec<RuntimeCardId>,
}

impl BattlefieldModule {
    pub fn new() -> Self {
        Self {
            players: Vec::new(),
            instances: HashMap::new(),
            turn: 0,
            phase: Phase::Draw,
            effect_log: Vec::new(),
            effect_stack: EffectStack::new(),
        }
    }

    /// 查找玩家数据（可变引用）
    pub fn find_player_mut(&mut self, player: &PlayerId) -> Option<&mut PlayerData> {
        self.players.iter_mut().find(|p| &p.id == player)
    }

    /// 查找玩家数据（不可变引用）
    pub fn find_player(&self, player: &PlayerId) -> Option<&PlayerData> {
        self.players.iter().find(|p| &p.id == player)
    }

    /// 获取卡牌实例（可变引用）
    pub fn instance_mut(&mut self, card_id: &RuntimeCardId) -> Option<&mut RuntimeCardInstance> {
        self.instances.get_mut(card_id)
    }

    /// 获取卡牌实例（不可变引用）
    pub fn instance(&self, card_id: &RuntimeCardId) -> Option<&RuntimeCardInstance> {
        self.instances.get(card_id)
    }

    /// 获取玩家手牌 ID 列表（轻量 API）
    pub fn get_player_hand_ids(&self, player: &PlayerId) -> Vec<String> {
        self.players.iter()
            .find(|p| &p.id == player)
            .map(|p| p.hand.iter().map(|rid| rid.0.clone()).collect())
            .unwrap_or_default()
    }

    /// 获取玩家战场 ID 列表（轻量 API）
    pub fn get_player_field_ids(&self, player: &PlayerId) -> Vec<String> {
        self.players.iter()
            .find(|p| &p.id == player)
            .map(|p| p.field.iter().map(|rid| rid.0.clone()).collect())
            .unwrap_or_default()
    }

    /// 获取玩家牌堆大小
    pub fn player_deck_size(&self, player: &PlayerId) -> usize {
        self.players.iter()
            .find(|p| &p.id == player)
            .map(|p| p.deck.len())
            .unwrap_or(0)
    }

    /// 获取当前回合数
    pub fn current_turn(&self) -> u32 { self.turn }

    /// 获取效果栈（用于高级结算逻辑）
    pub fn effect_stack(&self) -> &EffectStack {
        &self.effect_stack
    }

    #[allow(dead_code)]
    fn gen_runtime_id(static_id: &StaticCardId, seq: u32) -> RuntimeCardId {
        RuntimeCardId(format!("{}_{}", static_id.0, seq))
    }

    fn log(&mut self, action: &str, actor: Option<&str>, target: Option<&str>, result: &str) {
        self.effect_log.push(LogEntry {
            turn: self.turn,
            action: action.to_string(),
            actor: actor.map(|s| s.to_string()),
            target: target.map(|s| s.to_string()),
            result: result.to_string(),
        });
    }
}

impl BattlefieldPort for BattlefieldModule {
    fn init_game(&mut self, player_count: u32) -> Result<(), String> {
        self.players.clear();
        self.instances.clear();
        self.turn = 1;
        self.phase = Phase::Draw;

        for i in 0..player_count {
            self.players.push(PlayerData {
                id: PlayerId(format!("P{}", i + 1)),
                hand: Vec::new(),
                field: Vec::new(),
                deck: Vec::new(),
                graveyard: Vec::new(),
            });
        }

        self.log("init_game", None, None, &format!("{} players", player_count));
        Ok(())
    }

    fn get_player_hand(&self, player: PlayerId) -> Vec<RuntimeCardInstance> {
        self.players.iter()
            .find(|p| p.id == player)
            .map(|p| {
                p.hand.iter()
                    .filter_map(|rid| self.instances.get(rid).cloned())
                    .collect()
            })
            .unwrap_or_default()
    }

    fn get_player_field(&self, player: PlayerId) -> Vec<RuntimeCardInstance> {
        self.players.iter()
            .find(|p| p.id == player)
            .map(|p| {
                p.field.iter()
                    .filter_map(|rid| self.instances.get(rid).cloned())
                    .collect()
            })
            .unwrap_or_default()
    }

    fn draw_card(&mut self, player: PlayerId) -> Result<RuntimeCardId, String> {
        let player_idx = self.players.iter()
            .position(|p| p.id == player)
            .ok_or("玩家不存在")?;

        let card_id = self.players[player_idx].deck.last().cloned()
            .ok_or("牌堆已空")?;

        self.players[player_idx].deck.pop();
        self.players[player_idx].hand.push(card_id.clone());
        if let Some(inst) = self.instances.get_mut(&card_id) {
            inst.zone = Zone::Hand;
        }

        self.log("draw_card", Some(&player.0), Some(&card_id.0), "抽牌");
        Ok(card_id)
    }

    fn play_card(
        &mut self,
        player: PlayerId,
        card: RuntimeCardId,
        target: Option<PlayerId>,
    ) -> Result<EffectResult, String> {
        let player_idx = self.players.iter()
            .position(|p| p.id == player)
            .ok_or("玩家不存在")?;

        let in_hand = self.players[player_idx].hand.contains(&card);
        if !in_hand {
            return Err(format!("{} 不在手牌中", card.0));
        }

        let inst_zone = self.instances.get(&card).map(|i| i.zone);
        if inst_zone != Some(Zone::Hand) {
            return Err(format!("{} 不在手牌区域", card.0));
        }

        if let Some(inst) = self.instances.get_mut(&card) {
            let mut hand = std::mem::take(&mut self.players[player_idx].hand);
            let mut field = std::mem::take(&mut self.players[player_idx].field);

            let result = zones::ZoneManager::hand_to_field(
                &mut hand, &mut field, inst, &card, 7,
            );

            self.players[player_idx].hand = hand;
            self.players[player_idx].field = field;

            if result != zones::ZoneMoveResult::Ok {
                return Err(format!("区域移动失败: {:?}", result));
            }
        }

        self.log("play_card", Some(&card.0), target.as_ref().map(|t| t.0.as_str()), "打出");

        Ok(EffectResult {
            success: true,
            log: self.effect_log.clone(),
            state_changes: Vec::new(),
        })
    }

    fn get_turn(&self) -> u32 { self.turn }
    fn get_phase(&self) -> Phase { self.phase }

    fn save_snapshot(&self, path: &Path) -> Result<(), String> {
        let json = serde_json::to_string_pretty(&serde_json::json!({
            "turn": self.turn,
            "phase": format!("{:?}", self.phase),
            "player_count": self.players.len(),
        })).map_err(|e| format!("序列化失败: {}", e))?;
        std::fs::write(path, json).map_err(|e| format!("写入失败: {}", e))
    }

    fn load_snapshot(&mut self, path: &Path) -> Result<(), String> {
        let _data = std::fs::read_to_string(path)
            .map_err(|e| format!("读取失败: {}", e))?;
        Ok(())
    }
}
