/**
 * TagCard — 单个标签卡片
 * 纯展示组件：接收 Tag 对象 prop，渲染名称/技能词条/首次出现/设计初衷
 * 不包含任何数据获取逻辑
 */

import React from "react";
import type { Tag } from "../../types/tag";
import { MarkBadge } from "./MarkBadge";

interface TagCardProps {
  tag: Tag;
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-bg-surface)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-md)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
  cursor: "default",
};

const nameStyle: React.CSSProperties = {
  fontSize: "var(--font-xl)",
  fontWeight: 700,
  color: "var(--color-primary)",
};

const skillListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-xs)",
};

const skillTagStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 6px",
  borderRadius: "var(--radius-sm)",
  background: "var(--color-bg-elevated)",
  fontSize: "var(--font-xs)",
  color: "var(--color-text-secondary)",
  fontFamily: "var(--font-mono)",
};

const metaStyle: React.CSSProperties = {
  fontSize: "var(--font-sm)",
  color: "var(--color-text-muted)",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  marginTop: "var(--space-xs)",
  borderTop: "1px solid var(--color-border-default)",
  paddingTop: "var(--space-sm)",
};

const intentStyle: React.CSSProperties = {
  fontSize: "var(--font-sm)",
  color: "var(--color-text-secondary)",
  fontStyle: "italic",
  lineHeight: 1.4,
};

export const TagCard: React.FC<TagCardProps> = ({ tag }) => {
  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-primary)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-glow)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-default)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={nameStyle}>{tag.name}</div>

      {tag.skill_entries.length > 0 && (
        <div style={skillListStyle}>
          {tag.skill_entries.map((entry, i) => (
            <span key={i} style={skillTagStyle}>
              {entry.level}: {entry.description}
            </span>
          ))}
        </div>
      )}

      <div style={metaStyle}>
        <div>
          首次出现：<MarkBadge color="var(--color-accent-blue)" label={tag.first_appearance} />
        </div>
        <div style={intentStyle}>{tag.design_intent}</div>
      </div>
    </div>
  );
};