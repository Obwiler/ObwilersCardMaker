/**
 * DuelPanel — 对峙面板
 * 场景选择 → 初始化对战 → 逐步执行回合 → DuelField + DuelLog
 */

import React, { useEffect, useState } from "react";
import { useDuel } from "../hooks/useDuel";
import { DuelField } from "./DuelField";
import { DuelLog } from "./DuelLog";
import type { ScenarioMatch } from "../../types/duel";

const containerStyle: React.CSSProperties = {
  display: "flex",
  height: "100%",
  overflow: "hidden",
};

const leftPanel: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const rightPanel: React.CSSProperties = {
  width: "340px",
  minWidth: "280px",
  borderLeft: "1px solid var(--color-border-default)",
};

const controlsStyle: React.CSSProperties = {
  padding: "var(--space-md)",
  borderBottom: "1px solid var(--color-border-default)",
  display: "flex",
  gap: "var(--space-sm)",
  flexWrap: "wrap",
  alignItems: "center",
};

const selectStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-md)",
  background: "var(--color-bg-surface)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text-primary)",
  fontSize: "var(--font-sm)",
  outline: "none",
  cursor: "pointer",
};

const btnStyle = (primary: boolean): React.CSSProperties => ({
  padding: "var(--space-sm) var(--space-md)",
  background: primary ? "var(--color-primary)" : "var(--color-bg-elevated)",
  color: primary ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
  border: primary ? "none" : "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontSize: "var(--font-sm)",
  fontWeight: 600,
  transition: "opacity var(--transition-fast)",
});

const resultBanner = (hasWinner: boolean): React.CSSProperties => ({
  padding: "var(--space-sm) var(--space-md)",
  background: hasWinner ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)",
  border: hasWinner ? "1px solid var(--color-accent-green)" : "1px solid var(--color-error)",
  borderRadius: "var(--radius-sm)",
  color: hasWinner ? "var(--color-accent-green)" : "var(--color-error)",
  fontWeight: 700,
  textAlign: "center" as const,
  margin: "var(--space-md)",
});

export const DuelPanel: React.FC = () => {
  const {
    state,
    scenarios,
    scenarioMatches,
    log,
    loading,
    error,
    init,
    execute,
    loadScenarios,
  } = useDuel();

  const [selectedScenario, setSelectedScenario] = useState("");

  useEffect(() => {
    loadScenarios();
  }, []);

  // 自动选第一个场景
  useEffect(() => {
    if (scenarios.length > 0 && !selectedScenario) {
      setSelectedScenario(scenarios[0].id);
    }
  }, [scenarios]);

  const handleInit = async () => {
    if (!selectedScenario) return;
    await init(selectedScenario);
  };

  const handleFreeBattle = async () => {
    // 自由对战：使用 free_battle 场景
    await init("free_battle");
  };

  const isActive = state && state.result === null;

  // 根据 scenarioMatches 构建匹配数查找
  const matchMap = new Map<string, ScenarioMatch>();
  scenarioMatches.forEach((m) => matchMap.set(m.id, m));

  return (
    <div style={containerStyle}>
      <div style={leftPanel}>
        <div style={controlsStyle}>
          <select
            style={selectStyle}
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
          >
            {scenarios.map((s) => {
              const match = matchMap.get(s.id);
              const matchCount = match ? match.first_matches + match.second_matches : 0;
              return (
                <option key={s.id} value={s.id}>
                  {s.name} {match ? `(匹配 ${matchCount})` : ""}
                </option>
              );
            })}
          </select>
          <button
            style={btnStyle(true)}
            onClick={handleInit}
            disabled={loading || !selectedScenario}
          >
            {state ? "重新初始化" : "初始化对战"}
          </button>
          <button
            style={{
              ...btnStyle(false),
              opacity: isActive && !loading ? 1 : 0.5,
            }}
            onClick={() => execute()}
            disabled={!isActive || loading}
          >
            {loading ? "执行中..." : "执行回合"}
          </button>
          <button
            style={{
              ...btnStyle(false),
              borderColor: "var(--color-accent-green)",
              color: "var(--color-accent-green)",
              opacity: !isActive ? 1 : 0.5,
            }}
            onClick={handleFreeBattle}
            disabled={isActive || loading}
          >
            自由对战
          </button>
          {error && (
            <span style={{ color: "var(--color-error)", fontSize: "var(--font-xs)" }}>
              {error}
            </span>
          )}
        </div>

        {state ? (
          <>
            <DuelField
              first={state.fields[0]}
              second={state.fields[1]}
              phase={state.phase}
              round={state.round}
              activePlayer={state.active_player}
            />
            {state.result && (
              <div style={resultBanner(state.result !== "Draw")}>
                {state.result === "FirstPlayerWin"
                  ? `${state.fields[0].name} 获胜！`
                  : state.result === "SecondPlayerWin"
                    ? `${state.fields[1].name} 获胜！`
                    : "平局"}
              </div>
            )}
          </>
        ) : (
          <div className="status-container" style={{ flex: 1 }}>
            <div className="status-text">选择一个场景并初始化对战</div>
          </div>
        )}
      </div>
      <div style={rightPanel}>
        <DuelLog entries={log} />
      </div>
    </div>
  );
};