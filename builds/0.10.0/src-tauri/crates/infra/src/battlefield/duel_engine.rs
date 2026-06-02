//! 对战规则引擎 — 实现 DuelEnginePort
//!
//! 对战抽象规则：init/start_turn/end_turn/win_condition
//! 不直接修改实例状态（状态变更由 BattlefieldPort 负责）。

use dz_cardmaker_ports::*;

pub struct DuelEngine {
    player_count: u32,
    active_player: u32,
    turn: u32,
    log: Vec<LogEntry>,
}

impl DuelEngine {
    pub fn new() -> Self {
        Self {
            player_count: 0,
            active_player: 0,
            turn: 0,
            log: Vec::new(),
        }
    }

    fn next_player(&self) -> u32 {
        (self.active_player % self.player_count) + 1
    }

    fn record(&mut self, action: &str, actor: Option<&str>, target: Option<&str>, result: &str) {
        self.log.push(LogEntry {
            turn: self.turn,
            action: action.to_string(),
            actor: actor.map(|s| s.to_string()),
            target: target.map(|s| s.to_string()),
            result: result.to_string(),
        });
    }
}

impl Default for DuelEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl DuelEnginePort for DuelEngine {
    fn init_duel(&mut self, player_count: u32) -> Result<(), String> {
        if player_count < 2 || player_count > 8 {
            return Err("玩家数必须在 2~8 之间".into());
        }

        self.player_count = player_count;
        self.active_player = 1;
        self.turn = 1;
        self.log.clear();

        self.record("init_duel", None, None, &format!("{} 名玩家", player_count));
        Ok(())
    }

    fn start_turn(&mut self, player: PlayerId) -> Result<(), String> {
        let expected = PlayerId(format!("P{}", self.active_player));
        if player != expected {
            return Err(format!("当前不是 {} 的回合", player.0));
        }

        self.record("start_turn", Some(&player.0), None, &format!("第{}回合", self.turn));
        Ok(())
    }

    fn end_turn(&mut self, player: PlayerId) -> Result<(), String> {
        let expected = PlayerId(format!("P{}", self.active_player));
        if player != expected {
            return Err(format!("当前不是 {} 的回合", player.0));
        }

        self.record("end_turn", Some(&player.0), None, "回合结束");

        self.active_player = self.next_player();
        if self.active_player == 1 {
            self.turn += 1;
        }

        Ok(())
    }

    fn check_win_condition(&self) -> Option<PlayerId> {
        // 当前简化实现：仅存 1 人即获胜
        // 完整实现需要检查 battlefield 中的存活状态
        if self.player_count == 1 {
            Some(PlayerId("P1".into()))
        } else {
            None
        }
    }

    fn get_effect_log(&self) -> Vec<LogEntry> {
        self.log.clone()
    }
}
