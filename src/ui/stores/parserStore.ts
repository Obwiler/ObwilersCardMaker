/**
 * parserStore — 解析器状态 Zustand Store
 * 替代 useParser hook 中的状态管理，保持 hooks 作为薄封装层
 */

import { create } from "zustand";
import type { ParseResult, ParseStats, CardValidation } from "../../types/parser";
import {
  invokeParseCard,
  invokeParseStats,
  invokeValidateAllCards,
} from "../../lib/tauri";

interface ParserStoreState {
  stats: ParseStats | null;
  loading: boolean;
  error: string | null;

  loadStats: () => Promise<void>;
  parseCard: (name: string, text: string) => Promise<ParseResult | null>;
  validateAll: () => Promise<CardValidation[]>;
}

export const useParserStore = create<ParserStoreState>((set) => ({
  stats: null,
  loading: false,
  error: null,

  loadStats: async () => {
    const result = await invokeParseStats();
    if (result.ok) set({ stats: result.data });
  },

  parseCard: async (name, text) => {
    set({ loading: true, error: null });
    const result = await invokeParseCard(name, text);
    set({ loading: false });
    if (result.ok) return result.data;
    set({ error: result.error });
    return null;
  },

  validateAll: async () => {
    set({ loading: true, error: null });
    const result = await invokeValidateAllCards();
    set({ loading: false });
    if (result.ok) return result.data;
    set({ error: result.error });
    return [];
  },
}));
