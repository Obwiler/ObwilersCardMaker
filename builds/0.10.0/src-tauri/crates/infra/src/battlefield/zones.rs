//! 区域管理器 — 5 区域状态迁移 + 合法性校验
//!
//! 区域：牌堆 / 手牌 / 场上 / 坟场 / 放逐
//!
//! 迁移规则（来自游戏规则）：
//!   Deck → Hand    抽牌（draw），回合开始自动
//!   Hand → Field   打出（play），主动行为
//!   Hand → Deck    退回（mulligan），允许
//!   Hand → Graveyard   弃置（discard），主动或效果
//!   Field → Graveyard  破坏（destroy），受到致命伤害
//!   Field → Hand   回手（bounce），效果触发
//!   Field → Exile  放逐（exile），移除游戏
//!   Graveyard → Hand   复活（recover），效果触发
//!   Graveyard → Exile  放逐坟墓，效果触发
//!   Exile → 无      放逐区不可再次移动

use dz_cardmaker_ports::{RuntimeCardId, RuntimeCardInstance, Zone};

pub struct ZoneManager;

#[derive(Debug, PartialEq, Eq)]
pub enum ZoneMoveResult {
    Ok,
    NotInZone { card_id: String, expected: Zone, actual: Zone },
    ZoneFull { zone: Zone, limit: usize },
    InvalidMove { from: Zone, to: Zone, reason: String },
}

impl ZoneManager {
    pub fn new() -> Self { Self }

    /// 将一张卡从 hand 移动到 field（打出）
    pub fn hand_to_field(
        hand: &mut Vec<RuntimeCardId>,
        field: &mut Vec<RuntimeCardId>,
        instance: &mut RuntimeCardInstance,
        card_id: &RuntimeCardId,
        field_limit: usize,
    ) -> ZoneMoveResult {
        if instance.zone != Zone::Hand {
            return ZoneMoveResult::NotInZone {
                card_id: card_id.0.clone(),
                expected: Zone::Hand,
                actual: instance.zone,
            };
        }
        if field.len() >= field_limit {
            return ZoneMoveResult::ZoneFull { zone: Zone::Field, limit: field_limit };
        }
        hand.retain(|id| id != card_id);
        field.push(card_id.clone());
        instance.zone = Zone::Field;
        ZoneMoveResult::Ok
    }

    /// 从 deck 顶部抽牌到 hand
    pub fn deck_to_hand(
        deck: &mut Vec<RuntimeCardId>,
        hand: &mut Vec<RuntimeCardId>,
        instance: &mut RuntimeCardInstance,
        hand_limit: usize,
    ) -> ZoneMoveResult {
        if instance.zone != Zone::Deck {
            return ZoneMoveResult::NotInZone {
                card_id: instance.runtime_id.0.clone(),
                expected: Zone::Deck,
                actual: instance.zone,
            };
        }
        if hand.len() >= hand_limit {
            return ZoneMoveResult::ZoneFull { zone: Zone::Hand, limit: hand_limit };
        }
        let card_id = deck.pop().unwrap();
        hand.push(card_id);
        instance.zone = Zone::Hand;
        ZoneMoveResult::Ok
    }

    /// 从 field 移动到 graveyard（被破坏）
    pub fn field_to_graveyard(
        field: &mut Vec<RuntimeCardId>,
        graveyard: &mut Vec<RuntimeCardId>,
        instance: &mut RuntimeCardInstance,
        card_id: &RuntimeCardId,
    ) -> ZoneMoveResult {
        if instance.zone != Zone::Field {
            return ZoneMoveResult::NotInZone {
                card_id: card_id.0.clone(),
                expected: Zone::Field,
                actual: instance.zone,
            };
        }
        field.retain(|id| id != card_id);
        graveyard.push(card_id.clone());
        instance.zone = Zone::Graveyard;
        ZoneMoveResult::Ok
    }

    /// 从 field 移动到 hand（回手）
    pub fn field_to_hand(
        field: &mut Vec<RuntimeCardId>,
        hand: &mut Vec<RuntimeCardId>,
        instance: &mut RuntimeCardInstance,
        card_id: &RuntimeCardId,
        hand_limit: usize,
    ) -> ZoneMoveResult {
        if instance.zone != Zone::Field {
            return ZoneMoveResult::NotInZone {
                card_id: card_id.0.clone(),
                expected: Zone::Field,
                actual: instance.zone,
            };
        }
        if hand.len() >= hand_limit {
            return ZoneMoveResult::ZoneFull { zone: Zone::Hand, limit: hand_limit };
        }
        field.retain(|id| id != card_id);
        hand.push(card_id.clone());
        instance.zone = Zone::Hand;
        ZoneMoveResult::Ok
    }

    /// 从手牌弃置到坟场
    pub fn hand_to_graveyard(
        hand: &mut Vec<RuntimeCardId>,
        graveyard: &mut Vec<RuntimeCardId>,
        instance: &mut RuntimeCardInstance,
        card_id: &RuntimeCardId,
    ) -> ZoneMoveResult {
        if instance.zone != Zone::Hand {
            return ZoneMoveResult::NotInZone {
                card_id: card_id.0.clone(),
                expected: Zone::Hand,
                actual: instance.zone,
            };
        }
        hand.retain(|id| id != card_id);
        graveyard.push(card_id.clone());
        instance.zone = Zone::Graveyard;
        ZoneMoveResult::Ok
    }

    /// 从 field 移动到 exile（放逐）
    pub fn to_exile(
        from: &mut Vec<RuntimeCardId>,
        instance: &mut RuntimeCardInstance,
        card_id: &RuntimeCardId,
    ) -> ZoneMoveResult {
        from.retain(|id| id != card_id);
        instance.zone = Zone::Exile;
        ZoneMoveResult::Ok
    }

    /// 从 graveyard 移动到 hand（复活）
    pub fn graveyard_to_hand(
        graveyard: &mut Vec<RuntimeCardId>,
        hand: &mut Vec<RuntimeCardId>,
        instance: &mut RuntimeCardInstance,
        card_id: &RuntimeCardId,
        hand_limit: usize,
    ) -> ZoneMoveResult {
        if instance.zone != Zone::Graveyard {
            return ZoneMoveResult::NotInZone {
                card_id: card_id.0.clone(),
                expected: Zone::Graveyard,
                actual: instance.zone,
            };
        }
        if hand.len() >= hand_limit {
            return ZoneMoveResult::ZoneFull { zone: Zone::Hand, limit: hand_limit };
        }
        graveyard.retain(|id| id != card_id);
        hand.push(card_id.clone());
        instance.zone = Zone::Hand;
        ZoneMoveResult::Ok
    }
}

impl Default for ZoneManager {
    fn default() -> Self { Self::new() }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_instance(id: &str, zone: Zone) -> RuntimeCardInstance {
        RuntimeCardInstance {
            runtime_id: RuntimeCardId(id.into()),
            static_def_ref: dz_cardmaker_ports::StaticCardId("TEST".into()),
            zone,
            owner: dz_cardmaker_ports::PlayerId("P1".into()),
            hp: 10, armor: 0, energy: 0,
            marks: Default::default(),
        }
    }

    #[test]
    fn test_play_card_valid() {
        let mut hand = vec![RuntimeCardId("card1".into())];
        let mut field = Vec::new();
        let mut inst = make_instance("card1", Zone::Hand);
        let rid = RuntimeCardId("card1".into());

        let result = ZoneManager::hand_to_field(&mut hand, &mut field, &mut inst, &rid, 7);
        assert_eq!(result, ZoneMoveResult::Ok);
        assert!(hand.is_empty());
        assert_eq!(field.len(), 1);
        assert_eq!(inst.zone, Zone::Field);
    }

    #[test]
    fn test_play_card_field_full() {
        let mut hand = vec![RuntimeCardId("card1".into())];
        let mut full_field = vec![
            RuntimeCardId("f1".into()), RuntimeCardId("f2".into()),
        ];
        let mut inst = make_instance("card1", Zone::Hand);
        let rid = RuntimeCardId("card1".into());

        let result = ZoneManager::hand_to_field(&mut hand, &mut full_field, &mut inst, &rid, 2);
        assert_eq!(result, ZoneMoveResult::ZoneFull { zone: Zone::Field, limit: 2 });
    }

    #[test]
    fn test_deck_to_hand_valid() {
        let mut deck = vec![RuntimeCardId("card1".into())];
        let mut hand = Vec::new();
        let mut inst = make_instance("card1", Zone::Deck);
        let result = ZoneManager::deck_to_hand(&mut deck, &mut hand, &mut inst, 10);
        assert_eq!(result, ZoneMoveResult::Ok);
        assert!(deck.is_empty());
        assert_eq!(hand.len(), 1);
        assert_eq!(inst.zone, Zone::Hand);
    }

    #[test]
    fn test_exile_prevents_further_moves() {
        let mut from = vec![RuntimeCardId("card1".into())];
        let mut inst = make_instance("card1", Zone::Field);
        let rid = RuntimeCardId("card1".into());
        ZoneManager::to_exile(&mut from, &mut inst, &rid);
        assert_eq!(inst.zone, Zone::Exile);
        assert!(from.is_empty());

        // Exiled cards cannot be moved again
        let mut hand = Vec::new();
        let mut graveyard = Vec::new();
        let result = ZoneManager::hand_to_graveyard(&mut hand, &mut graveyard, &mut inst, &rid);
        assert_eq!(result, ZoneMoveResult::NotInZone {
            card_id: "card1".into(),
            expected: Zone::Hand,
            actual: Zone::Exile,
        });
    }
}
