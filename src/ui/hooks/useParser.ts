/**
 * 解析器 Hook — 薄封装层，兼容现有组件
 * 状态管理委托给 parserStore (Zustand)
 */

import { useEffect } from "react";
import { useParserStore } from "../stores/parserStore";

export function useParser() {
  const store = useParserStore();

  useEffect(() => {
    if (!store.stats) {
      store.loadStats();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    stats: store.stats,
    parseCard: store.parseCard,
    validateAll: store.validateAll,
    loading: store.loading,
    error: store.error,
  };
}
