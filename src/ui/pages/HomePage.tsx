import React from "react";
import type { PageKey } from "../components/Sidebar";
import { StatsPanel } from "../components/StatsPanel";
import { APP_VERSION } from "../../utils/version";

interface HomePageProps { onNavigate: (page: PageKey) => void; }

const containerStyle: React.CSSProperties = { padding: "var(--space-lg)", overflow: "auto", height: "100%" };
const heroStyle: React.CSSProperties = { textAlign: "center", padding: "var(--space-2xl) 0" };
const heroTitleStyle: React.CSSProperties = { fontSize: "var(--heading-h1)", fontWeight: 800, color: "var(--color-primary)", marginBottom: "var(--space-sm)" };
const heroSubStyle: React.CSSProperties = { fontSize: "var(--font-lg)", color: "var(--color-text-muted)" };
const quickLinksStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "var(--space-md)", marginTop: "var(--space-lg)" };
const linkCardStyle: React.CSSProperties = { background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", padding: "var(--space-lg)", cursor: "pointer", transition: "all var(--transition-fast)", display: "flex", flexDirection: "column", gap: "var(--space-sm)" };
const linkTitleStyle: React.CSSProperties = { fontSize: "var(--font-xl)", fontWeight: 700 };
const linkDescStyle: React.CSSProperties = { fontSize: "var(--font-sm)", color: "var(--color-text-muted)" };

const quickEntries: { key: PageKey; title: string; desc: string; color: string; icon: string }[] = [
  { key: "tags", title: "标签字典", desc: "浏览全部 15 个标签，查看技能词条与设计初衷", color: "var(--color-primary)", icon: "▣" },
  { key: "cards", title: "卡牌浏览", desc: "浏览 157 张卡牌，按标签筛选，查看五段式语法", color: "var(--color-accent-blue)", icon: "▤" },
  { key: "parser", title: "语法解析", desc: "即时解析卡牌文本，校验五段式语法", color: "var(--color-accent-green)", icon: "▶" },
  { key: "duel", title: "对峙测试", desc: "选择预设场景，逐步执行回合，可视化对峙过程", color: "var(--color-accent-orange)", icon: "◎" },
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => (
  <div style={containerStyle}>
    <div style={heroStyle}>
      <div style={heroTitleStyle}>CardMaker {APP_VERSION}</div>
      <div style={heroSubStyle}>《对峙》卡牌制作与测试工具</div>
    </div>
    <StatsPanel />
    <div style={{ marginTop: "var(--space-lg)" }}>
      <h3 style={{ fontSize: "var(--font-lg)", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "var(--space-md)" }}>快速入口</h3>
      <div style={quickLinksStyle}>
        {quickEntries.map((entry) => (
          <div key={entry.key} style={linkCardStyle} onClick={() => onNavigate(entry.key)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = entry.color; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${entry.color}22`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-default)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
            <div style={{ fontSize: "var(--font-2xl)" }}>{entry.icon}</div>
            <div style={{ ...linkTitleStyle, color: entry.color }}>{entry.title}</div>
            <div style={linkDescStyle}>{entry.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);