/**
 * duelStore — 对峙状态 Zustand Store
 * 替代 useDuel hook 中的状态管理，保持 hooks 作为薄封装层
 */

import { create } from "zustand";
import type {
  DuelState,
  EffectLogEntry,
  Scenario,
  ScenarioMatch,
  PhaseInfo,
  CardInfo,
} from "../../types/duel";
import {
  invokeInitDuel,
  invokeExecuteTurn,
  invokeGetDuelState,
  invokeGetEffectLog,
  invokeListDuelScenarios,
  invokeListDuelScenariosWithMatches,
  invokeGetDuelPhaseInfo,
} from "../../lib/tauri";

interface DuelStoreState {
  state: DuelState | null;
  scenarios: Scenario[];
  scenarioMatches: ScenarioMatch[];
  phaseInfo: PhaseInfo[];
  log: EffectLogEntry[];
  loading: boolean;
  error: string | null;

  refreshState: () => Promise<void>;
  refreshLog: () => Promise<void>;
  loadScenarios: () => Promise<void>;
  loadScenarioMatches: (cardPool: CardInfo[]) => Promise<void>;
  init: (scenarioId: string) => Promise<DuelState | null>;
  execute: () => Promise<DuelState | null>;
}

export const useDuelStore = create<DuelStoreState>((set, get) => ({
  state: null,
  scenarios: [],
  scenarioMatches: [],
  phaseInfo: [],
  log: [],
  loading: false,
  error: null,

  refreshState: async () => {
    const result = await invokeGetDuelState();
    if (result.ok && result.data) {
      set({ state: result.data });
    } else if (!result.ok) {
      set({ error: result.error });
    }
  },

  refreshLog: async () => {
    const result = await invokeGetEffectLog();
    if (result.ok) {
      set({ log: result.data.slice(-100) });
    }
  },

  loadScenarios: async () => {
    const [scResult, phResult] = await Promise.all([
      invokeListDuelScenarios(),
      invokeGetDuelPhaseInfo(),
    ]);
    if (scResult.ok) set({ scenarios: scResult.data });
    if (phResult.ok) set({ phaseInfo: phResult.data });
  },

  loadScenarioMatches: async (cardPool: CardInfo[]) => {
    const smResult = await invokeListDuelScenariosWithMatches(cardPool);
    if (smResult.ok) set({ scenarioMatches: smResult.data });
  },

  init: async (scenarioId) => {
    set({ loading: true, error: null });
    const result = await invokeInitDuel(scenarioId);
    set({ loading: false });
    if (result.ok) {
      set({ state: result.data, log: [] });
      return result.data;
    }
    set({ error: result.error });
    return null;
  },

  execute: async () => {
    set({ loading: true, error: null });
    const result = await invokeExecuteTurn();
    set({ loading: false });
    if (result.ok) {
      set({ state: result.data });
      await get().refreshLog();
      return result.data;
    }
    set({ error: result.error });
    return null;
  },
}));
