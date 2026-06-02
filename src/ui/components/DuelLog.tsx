/**
 * DuelLog — 效果日志
 * 虚拟样式列表，最多保留 100 条
 */

import React, { useRef, useEffect } from "react";
import type { EffectLogEntry } from "../../types/duel";

interface DuelLogProps {
  entries: EffectLogEntry[];
}

const containerStyle: React.CSSProperties = {
  background: "var(--color-bg-surface)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-md)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  height: "100%",
};

const headerStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-md)",
  borderBottom: "1px solid var(--color-border-default)",
  fontSize: "var(--font-sm)",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  background: "var(--color-bg-elevated)",
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: "var(--space-sm)",
};

const entryStyle: React.CSSProperties = {
  padding: "var(--space-xs) var(--space-sm)",
  fontSize: "var(--font-xs)",
  fontFamily: "var(--font-mono)",
  borderBottom: "1px solid var(--color-border-default)",
  lineHeight: 1.5,
};

const phaseColor: Record<string, string> = {
  Preparation: "var(--color-text-muted)",
  FirstPlayerTurn: "var(--color-accent-blue)",
  SecondPlayerTurn: "var(--color-accent-orange)",
  Settlement: "var(--color-accent-purple)",
  End: "var(--color-text-muted)",
};

export const DuelLog: React.FC<DuelLogProps> = ({ entries }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>效果日志 ({entries.length})</div>
      <div style={listStyle}>
        {entries.length === 0 ? (
          <div
            style={{
              color: "var(--color-text-muted)",
              textAlign: "center",
              padding: "var(--space-lg)",
              fontSize: "var(--font-sm)",
            }}
          >
            暂无日志
          </div>
        ) : (
          entries.map((entry, i) => (
            <div key={i} style={entryStyle}>
              <span style={{ color: "var(--color-text-muted)" }}>
                R{entry.round}
              </span>{" "}
              <span style={{ color: phaseColor[entry.phase] ?? "var(--color-text-muted)" }}>
                [{entry.phase}]
              </span>{" "}
              <span style={{ color: "var(--color-accent-yellow)" }}>{entry.source}</span>
              <span style={{ color: "var(--color-text-secondary)" }}> — {entry.description}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};