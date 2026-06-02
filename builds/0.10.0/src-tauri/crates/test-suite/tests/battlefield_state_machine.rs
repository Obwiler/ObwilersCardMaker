use dz_cardmaker_infra::battlefield::BattlefieldModule;
use dz_cardmaker_infra::battlefield::DuelEngine;
use dz_cardmaker_ports::{BattlefieldPort, DuelEnginePort, PlayerId, RuntimeCardId};

mod tests {
    use super::*;

    // ========================================================================
    // BattlefieldModule —— init_game 测试
    // ========================================================================

    #[test]
    fn test_battlefield_init_2_players() {
        let mut bf = BattlefieldModule::new();
        let result = bf.init_game(2);
        assert!(result.is_ok(), "2 人游戏初始化应成功: {:?}", result.err());
        assert_eq!(bf.get_turn(), 1);
        assert_eq!(bf.get_phase(), dz_cardmaker_ports::Phase::Draw);
    }

    #[test]
    fn test_battlefield_init_3_players() {
        let mut bf = BattlefieldModule::new();
        let result = bf.init_game(3);
        assert!(result.is_ok(), "3 人游戏初始化应成功: {:?}", result.err());
        assert_eq!(bf.get_turn(), 1);
    }

    #[test]
    fn test_battlefield_init_4_players() {
        let mut bf = BattlefieldModule::new();
        let result = bf.init_game(4);
        assert!(result.is_ok(), "4 人游戏初始化应成功: {:?}", result.err());

        for i in 1..=4 {
            let pid = PlayerId(format!("P{}", i));
            let hand = bf.get_player_hand(pid.clone());
            let field = bf.get_player_field(pid);
            assert!(hand.is_empty(), "P{} 初始手牌应为空", i);
            assert!(field.is_empty(), "P{} 初始战场应为空", i);
        }
    }

    // ========================================================================
    // DuelEngine —— 玩家数量校验测试
    // ========================================================================

    #[test]
    fn test_duel_engine_init_1_player_fails() {
        let mut engine = DuelEngine::new();
        let result = engine.init_duel(1);
        assert!(result.is_err(), "1 名玩家初始化应失败");
        let err_msg = result.unwrap_err();
        assert!(err_msg.contains("2~8") || err_msg.contains("玩家数"), "错误信息应提示玩家数范围: {}", err_msg);
    }

    #[test]
    fn test_duel_engine_init_9_players_fails() {
        let mut engine = DuelEngine::new();
        let result = engine.init_duel(9);
        assert!(result.is_err(), "9 名玩家初始化应失败");
        let err_msg = result.unwrap_err();
        assert!(err_msg.contains("2~8") || err_msg.contains("玩家数"), "错误信息应提示玩家数范围: {}", err_msg);
    }

    #[test]
    fn test_duel_engine_init_2_players_succeeds() {
        let mut engine = DuelEngine::new();
        let result = engine.init_duel(2);
        assert!(result.is_ok(), "2 名玩家初始化应成功: {:?}", result.err());
    }

    #[test]
    fn test_duel_engine_init_8_players_succeeds() {
        let mut engine = DuelEngine::new();
        let result = engine.init_duel(8);
        assert!(result.is_ok(), "8 名玩家初始化应成功: {:?}", result.err());
    }

    // ========================================================================
    // BattlefieldModule —— draw_card / play_card 测试
    // ========================================================================

    #[test]
    fn test_battlefield_draw_card_empty_deck() {
        let mut bf = BattlefieldModule::new();
        bf.init_game(2).expect("初始化应成功");

        let result = bf.draw_card(PlayerId("P1".into()));
        assert!(result.is_err(), "空牌堆抽牌应失败");
        let err_msg = result.unwrap_err();
        assert!(err_msg.contains("已空") || err_msg.contains("牌堆"), "错误信息应提示牌堆为空: {}", err_msg);
    }

    #[test]
    fn test_battlefield_play_card_not_in_hand() {
        let mut bf = BattlefieldModule::new();
        bf.init_game(2).expect("初始化应成功");

        let card_id = RuntimeCardId("nonexistent_card".into());
        let result = bf.play_card(PlayerId("P1".into()), card_id, None);
        assert!(result.is_err(), "手牌中不存在的卡牌,打出应失败");
    }

    // ========================================================================
    // BattlefieldModule —— save_snapshot / load_snapshot 测试
    // ========================================================================

    #[test]
    fn test_battlefield_save_snapshot_creates_file() {
        let mut bf = BattlefieldModule::new();
        bf.init_game(2).expect("初始化应成功");

        let dir = tempfile::tempdir().expect("创建临时目录应成功");
        let snapshot_path = dir.path().join("snapshot.json");

        let result = bf.save_snapshot(&snapshot_path);
        assert!(result.is_ok(), "保存快照应成功: {:?}", result.err());
        assert!(snapshot_path.exists(), "快照文件应存在");

        let content = std::fs::read_to_string(&snapshot_path)
            .expect("读取快照文件应成功");
        assert!(content.contains("turn"), "快照应包含 turn 字段");
        assert!(content.contains("phase"), "快照应包含 phase 字段");
        assert!(content.contains("player_count"), "快照应包含 player_count 字段");
    }

    #[test]
    fn test_battlefield_save_snapshot_content_correct() {
        let mut bf = BattlefieldModule::new();
        bf.init_game(3).expect("初始化应成功");

        let dir = tempfile::tempdir().expect("创建临时目录应成功");
        let snapshot_path = dir.path().join("game_state.json");

        bf.save_snapshot(&snapshot_path).expect("保存快照应成功");

        let content = std::fs::read_to_string(&snapshot_path)
            .expect("读取快照文件应成功");
        let parsed: serde_json::Value = serde_json::from_str(&content)
            .expect("快照应为合法 JSON");

        assert_eq!(parsed["turn"], 1, "初始回合应为 1");
        assert_eq!(parsed["player_count"], 3, "玩家数应为 3");
    }

    // ========================================================================
    // DuelEngine —— 回合流程测试
    // ========================================================================

    #[test]
    fn test_duel_engine_turn_flow() {
        let mut engine = DuelEngine::new();
        engine.init_duel(2).expect("初始化应成功");

        assert!(engine.start_turn(PlayerId("P1".into())).is_ok());
        assert!(engine.end_turn(PlayerId("P1".into())).is_ok());

        assert!(engine.start_turn(PlayerId("P2".into())).is_ok());
        assert!(engine.end_turn(PlayerId("P2".into())).is_ok());

        assert!(engine.start_turn(PlayerId("P1".into())).is_ok());
    }

    #[test]
    fn test_duel_engine_wrong_player_turn_fails() {
        let mut engine = DuelEngine::new();
        engine.init_duel(2).expect("初始化应成功");

        let result = engine.start_turn(PlayerId("P2".into()));
        assert!(result.is_err(), "非活跃玩家开始回合应失败");
    }

    #[test]
    fn test_duel_engine_end_turn_wrong_player_fails() {
        let mut engine = DuelEngine::new();
        engine.init_duel(2).expect("初始化应成功");

        engine.start_turn(PlayerId("P1".into())).expect("P1 开始回合应成功");

        let result = engine.end_turn(PlayerId("P2".into()));
        assert!(result.is_err(), "非活跃玩家结束回合应失败");
    }

    #[test]
    fn test_duel_engine_effect_log() {
        let mut engine = DuelEngine::new();
        engine.init_duel(2).expect("初始化应成功");
        engine.start_turn(PlayerId("P1".into())).expect("开始回合应成功");
        engine.end_turn(PlayerId("P1".into())).expect("结束回合应成功");

        let log = engine.get_effect_log();
        assert!(!log.is_empty(), "效果日志不应为空");
        assert!(log.iter().any(|e| e.action == "init_duel"), "日志应包含 init_duel");
        assert!(log.iter().any(|e| e.action == "start_turn"), "日志应包含 start_turn");
        assert!(log.iter().any(|e| e.action == "end_turn"), "日志应包含 end_turn");
    }

    // ========================================================================
    // BattlefieldModule —— load_snapshot 测试
    // ========================================================================

    #[test]
    fn test_battlefield_load_snapshot() {
        let mut bf = BattlefieldModule::new();
        bf.init_game(2).expect("初始化应成功");

        let dir = tempfile::tempdir().expect("创建临时目录应成功");
        let snapshot_path = dir.path().join("snapshot.json");

        bf.save_snapshot(&snapshot_path).expect("保存快照应成功");

        let mut bf2 = BattlefieldModule::new();
        let result = bf2.load_snapshot(&snapshot_path);
        assert!(result.is_ok(), "加载快照应成功: {:?}", result.err());
    }
}
