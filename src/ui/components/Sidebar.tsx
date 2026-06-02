/**
 * Sidebar — 侧边导航
 * 基于 useTags().tags 动态生成标签导航项（数据驱动）
 * 可折叠，带宽度过渡动画
 */

import React, { useState } from "react";
import { useTags } from "../hooks/useTags";
import { useThemeStore } from "../stores/themeStore";
import { APP_VERSION } from "../../utils/version";

export type PageKey = "home" | "tags" | "cards" | "parser" | "duel" | "editor" | "devtools";

interface SidebarProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}

const sidebarStyle = (collapsed: boolean): React.CSSProperties => ({
  width: collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)",
  minWidth: collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)",
  background: "var(--color-bg-surface)",
  borderRight: "1px solid var(--color-border-default)",
  display: "flex",
  flexDirection: "column",
  transition: "width var(--transition-slow), min-width var(--transition-slow)",
  overflow: "hidden",
});

const logoStyle: React.CSSProperties = {
  padding: "var(--space-md)",
  fontSize: "var(--font-xl)",
  fontWeight: 800,
  color: "var(--color-primary)",
  whiteSpace: "nowrap",
  letterSpacing: "-0.5px",
};

const versionStyle: React.CSSProperties = {
  fontSize: "var(--font-xs)",
  color: "var(--color-text-muted)",
  padding: "0 var(--space-md)",
  whiteSpace: "nowrap",
};

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: "var(--space-md) var(--space-sm)",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  overflow: "auto",
};

const navItemStyle = (active: boolean, collapsed: boolean): React.CSSProperties => ({
  padding: collapsed ? "var(--space-sm)" : "var(--space-sm) var(--space-md)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  fontSize: "var(--font-sm)",
  fontWeight: active ? 600 : 400,
  color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
  background: active ? "var(--color-primary-glow)" : "transparent",
  transition: "all var(--transition-fast)",
  whiteSpace: "nowrap",
  userSelect: "none",
});

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: "var(--color-border-default)",
  margin: "var(--space-sm) 0",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "var(--font-xs)",
  color: "var(--color-text-muted)",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  padding: "var(--space-sm) var(--space-xs)",
  whiteSpace: "nowrap",
};

const collapseBtnStyle: React.CSSProperties = {
  padding: "var(--space-sm)",
  margin: "var(--space-sm)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-sm)",
  background: "transparent",
  color: "var(--color-text-muted)",
  cursor: "pointer",
  fontSize: "var(--font-sm)",
  transition: "color var(--transition-fast)",
};

const MAX_VISIBLE_TAGS = 8;

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { tags } = useTags();
  const { theme, toggle } = useThemeStore();

  const mainItems: { key: PageKey; label: string; icon: string }[] = [
    { key: "home", label: "仪表盘", icon: "◈" },
    { key: "tags", label: "标签字典", icon: "▣" },
    { key: "cards", label: "卡牌浏览", icon: "▤" },
    { key: "editor", label: "编辑卡牌", icon: "✎" },
    { key: "parser", label: "语法解析", icon: "▶" },
    { key: "duel", label: "对峙测试", icon: "◎" },
  ];

  return (
    <div style={sidebarStyle(collapsed)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: "var(--space-sm)" }}>
        <div>
          <div style={logoStyle}>
            {collapsed ? "CM" : "CardMaker"}
          </div>
          {!collapsed && <div style={versionStyle}>v{APP_VERSION}</div>}
        </div>
      </div>

      <nav style={navStyle}>
        {mainItems.map((item) => (
          <div
            key={item.key}
            style={navItemStyle(currentPage === item.key, collapsed)}
            onClick={() => onNavigate(item.key)}
            title={collapsed ? item.label : undefined}
          >
            <span>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </div>
        ))}

        {!collapsed && <div style={dividerStyle} />}
        {!collapsed && <div style={sectionTitleStyle}>标签 ({tags.length})</div>}

        {!collapsed &&
          tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
            <div
              key={tag.tag_id}
              style={navItemStyle(false, false)}
              onClick={() => onNavigate("tags")}
            >
              <span style={{ color: "var(--color-text-muted)" }}>#</span>
              <span>{tag.name}</span>
            </div>
          ))}
        {!collapsed && tags.length > MAX_VISIBLE_TAGS && (
          <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", padding: "var(--space-xs) var(--space-md)" }}>
            +{tags.length - MAX_VISIBLE_TAGS} 更多...
          </div>
        )}
      </nav>

      <div style={{ display: "flex", gap: "var(--space-xs)", padding: "0 var(--space-sm) var(--space-sm)" }}>
        <button
          style={collapseBtnStyle}
          onClick={toggle}
          title={`切换到${theme === "dark" ? "亮色" : "暗色"}模式`}
        >
          {theme === "dark" ? "\u2600" : "\u263E"}
        </button>
        <button
          style={collapseBtnStyle}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          {collapsed ? "\u25B8" : "\u25C2"}
        </button>
      </div>
    </div>
  );
};