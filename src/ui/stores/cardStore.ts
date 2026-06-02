/**
 * cardStore — 卡牌数据 Zustand Store
 * 替代 useCards hook 中的状态管理，保持 hooks 作为薄封装层
 */

import { create } from "zustand";
import type { Card, CardValidation } from "../../types/parser";
import {
  invokeParseAllCards,
  invokeValidateAllCards,
  invokeCreateCard,
  invokeUpdateCard,
  invokeDeleteCard,
  invokeSaveCards,
} from "../../lib/tauri";

interface CardState {
  cards: Card[];
  validations: CardValidation[];
  loading: boolean;
  error: string | null;

  // Actions
  fetch: () => Promise<void>;
  createCard: (name: string, tags: string[], text: string) => Promise<Card | null>;
  updateCard: (id: string, name?: string, tags?: string[], text?: string) => Promise<Card | null>;
  deleteCard: (id: string) => Promise<boolean>;
  saveCards: () => Promise<boolean>;
}

export const useCardStore = create<CardState>((set) => ({
  cards: [],
  validations: [],
  loading: true,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    const [cardsResult, validationsResult] = await Promise.all([
      invokeParseAllCards(),
      invokeValidateAllCards(),
    ]);
    if (cardsResult.ok) {
      set({ cards: cardsResult.data });
    } else {
      set({ error: cardsResult.error });
    }
    if (validationsResult.ok) {
      set({ validations: validationsResult.data });
    }
    set({ loading: false });
  },

  createCard: async (name, tags, text) => {
    const result = await invokeCreateCard(name, tags, text);
    if (result.ok) {
      set((s) => ({ cards: [...s.cards, result.data] }));
      return result.data;
    }
    set({ error: result.error });
    return null;
  },

  updateCard: async (id, name, tags, text) => {
    const result = await invokeUpdateCard(id, name, tags, text);
    if (result.ok) {
      set((s) => ({
        cards: s.cards.map((c) => (c.id === id ? result.data : c)),
      }));
      return result.data;
    }
    set({ error: result.error });
    return null;
  },

  deleteCard: async (id) => {
    const result = await invokeDeleteCard(id);
    if (result.ok && result.data) {
      set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
      return true;
    }
    if (!result.ok) set({ error: result.error });
    return false;
  },

  saveCards: async () => {
    const result = await invokeSaveCards();
    if (result.ok) return true;
    set({ error: result.error });
    return false;
  },
}));
