import React, { useEffect, useState } from "react";
import type { ParseStats } from "../../types/parser";
import { invokeParseStats } from "../../lib/tauri";

const containerStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "var(--space-md)",
  padding: "var(--space-md)",
};

const statCardStyle: React.CSSProperties = {
  background: "var(--color-bg-surface)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-lg)",
  textAlign: "center",
};

const statValueStyle: React.CSSProperties = {
  fontSize: "var(--font-4xl)",
  fontWeight: 700,
  marginBottom: "var(--space-xs)",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: "var(--font-sm)",
  color: "var(--color-text-muted)",
};

export const StatsPanel: React.FC = () => {
  const [stats, setStats] = useState<ParseStats | null>(null);

  useEffect(() => {
    invokeParseStats().then((r) => { if (r.ok) setStats(r.data); });
  }, []);

  return (
    <div style={containerStyle}>
      <div style={statCardStyle}>
        <div style={{ ...statValueStyle, color: "var(--color-primary)" }}>{"—"}</div>
        <div style={statLabelStyle}>标签数</div>
      </div>
      <div style={statCardStyle}>
        <div style={{ ...statValueStyle, color: "var(--color-accent-blue)" }}>{stats?.total ?? "—"}</div>
        <div style={statLabelStyle}>卡牌总数</div>
      </div>
      <div style={statCardStyle}>
        <div style={{ ...statValueStyle, color: "var(--color-accent-green)" }}>{stats?.parsed ?? "—"}</div>
        <div style={statLabelStyle}>解析成功</div>
      </div>
      <div style={statCardStyle}>
        <div style={{ ...statValueStyle, color: "var(--color-error)" }}>{stats?.failed ?? "—"}</div>
        <div style={statLabelStyle}>解析失败</div>
      </div>
      <div style={statCardStyle}>
        <div style={{ ...statValueStyle, color: "var(--color-accent-orange)" }}>{"—"}</div>
        <div style={statLabelStyle}>对战场景</div>
      </div>
    </div>
  );
};