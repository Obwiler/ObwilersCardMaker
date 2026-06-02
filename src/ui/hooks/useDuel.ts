/**
 * 对峙 Hook — 薄封装层，兼容现有组件
 * 状态管理委托给 duelStore (Zustand)
 */

import { useDuelStore } from "../stores/duelStore";

export function useDuel() {
  const store = useDuelStore();

  return {
    state: store.state,
    scenarios: store.scenarios,
    scenarioMatches: store.scenarioMatches,
    phaseInfo: store.phaseInfo,
    log: store.log,
    loading: store.loading,
    error: store.error,
    init: store.init,
    execute: store.execute,
    refreshState: store.refreshState,
    refreshLog: store.refreshLog,
    loadScenarios: store.loadScenarios,
    loadScenarioMatches: store.loadScenarioMatches,
  };
}
