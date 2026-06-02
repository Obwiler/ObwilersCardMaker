/**
 * DuelField — 对峙场地可视化
 * 双方生命条、护甲条、技力条、当前标记徽章
 */

import React from "react";
import type { PlayerField } from "../../types/duel";
import { MarkBadge } from "./MarkBadge";

interface DuelFieldProps {
  first: PlayerField;
  second: PlayerField;
  phase: string;
  round: number;
  activePlayer: string;
}

const fieldContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  padding: "var(--space-md)",
};

const playerCardStyle = (isActive: boolean): React.CSSProperties => ({
  background: "var(--color-bg-surface)",
  border: isActive ? "2px solid var(--color-primary)" : "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-md)",
  boxShadow: isActive ? "var(--shadow-glow)" : "none",
  transition: "all var(--transition-normal)",
});

const playerHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "var(--space-sm)",
};

const playerName: React.CSSProperties = {
  fontSize: "var(--font-xl)",
  fontWeight: 700,
};

const factionStyle: React.CSSProperties = {
  fontSize: "var(--font-xs)",
  color: "var(--color-text-muted)",
};

const barContainer: React.CSSProperties = {
  height: 8,
  borderRadius: "var(--radius-full)",
  background: "var(--color-bg-base)",
  marginBottom: "var(--space-xs)",
  overflow: "hidden",
};

const statRow: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-md)",
  fontSize: "var(--font-xs)",
  color: "var(--color-text-muted)",
  marginBottom: "var(--space-sm)",
};

const marksRow: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-xs)",
  flexWrap: "wrap",
  marginTop: "var(--space-sm)",
};

const MARK_COLORS: Record<string, string> = {
  "儒": "var(--color-accent-green)",
  "法": "var(--color-accent-orange)",
  "道": "var(--color-accent-purple)",
  "墨": "var(--color-accent-blue)",
  "兵": "var(--color-error)",
  "纵横": "var(--color-accent-cyan)",
  "阴阳": "var(--color-accent-yellow)",
  "杂": "var(--color-text-muted)",
};

function getMarkColor(name: string): string {
  for (const [key, color] of Object.entries(MARK_COLORS)) {
    if (name.includes(key)) return color;
  }
  return "var(--color-text-muted)";
}

export const DuelField: React.FC<DuelFieldProps> = ({
  first,
  second,
  phase,
  round,
  activePlayer,
}) => {
  const phaseLabel: Record<string, string> = {
    Preparation: "准备阶段",
    FirstPlayerTurn: "先手回合",
    SecondPlayerTurn: "后手回合",
    Settlement: "结算阶段",
    End: "结束",
  };

  return (
    <div style={fieldContainer}>
      <div style={{ textAlign: "center", fontSize: "var(--font-sm)", color: "var(--color-text-muted)" }}>
        第 {round} 回合 · {phaseLabel[phase] ?? phase}
      </div>

      {/* 先手 */}
      <div style={playerCardStyle(activePlayer === "First")}>
        <div style={playerHeader}>
          <span style={{ ...playerName, color: activePlayer === "First" ? "var(--color-primary)" : "var(--color-text-primary)" }}>
            {first.name}
          </span>
          <span style={factionStyle}>{first.faction}</span>
        </div>

        {/* 生命条 */}
        <div style={barContainer}>
          <div
            style={{
              height: "100%",
              width: `${(first.hp / first.max_hp) * 100}%`,
              background: "var(--color-error)",
              borderRadius: "var(--radius-full)",
              transition: "width var(--transition-slow)",
            }}
          />
        </div>
        <div style={statRow}>
          <span>HP {first.hp}/{first.max_hp}</span>
          {first.armor > 0 && <span>护甲 {first.armor}</span>}
          <span>技力 {first.energy}/{first.max_energy}</span>
          <span>ATK {first.physical_attack}/{first.magic_attack}</span>
        </div>

        {/* 标记 */}
        {Object.keys(first.marks).length > 0 && (
          <div style={marksRow}>
            {Object.entries(first.marks).map(([name, count]) => (
              <MarkBadge key={name} color={getMarkColor(name)} label={`${name}×${count}`} />
            ))}
          </div>
        )}
      </div>

      {/* 后手 */}
      <div style={playerCardStyle(activePlayer === "Second")}>
        <div style={playerHeader}>
          <span style={{ ...playerName, color: activePlayer === "Second" ? "var(--color-primary)" : "var(--color-text-primary)" }}>
            {second.name}
          </span>
          <span style={factionStyle}>{second.faction}</span>
        </div>

        <div style={barContainer}>
          <div
            style={{
              height: "100%",
              width: `${(second.hp / second.max_hp) * 100}%`,
              background: "var(--color-error)",
              borderRadius: "var(--radius-full)",
              transition: "width var(--transition-slow)",
            }}
          />
        </div>
        <div style={statRow}>
          <span>HP {second.hp}/{second.max_hp}</span>
          {second.armor > 0 && <span>护甲 {second.armor}</span>}
          <span>技力 {second.energy}/{second.max_energy}</span>
          <span>ATK {second.physical_attack}/{second.magic_attack}</span>
        </div>

        {Object.keys(second.marks).length > 0 && (
          <div style={marksRow}>
            {Object.entries(second.marks).map(([name, count]) => (
              <MarkBadge key={name} color={getMarkColor(name)} label={`${name}×${count}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};