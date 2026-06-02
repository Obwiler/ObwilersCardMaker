/**
 * 卡牌数据 Hook — 薄封装层，兼容现有组件
 * 状态管理委托给 cardStore (Zustand)
 */

import { useEffect } from "react";
import { useCardStore } from "../stores/cardStore";

export type { Card, CardValidation } from "../../types/parser";

export function useCards() {
  const store = useCardStore();

  useEffect(() => {
    store.fetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    cards: store.cards,
    validations: store.validations,
    loading: store.loading,
    error: store.error,
    refresh: store.fetch,
    createCard: store.createCard,
    updateCard: store.updateCard,
    deleteCard: store.deleteCard,
    saveCards: store.saveCards,
  };
}
