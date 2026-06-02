/**
 * CardItem — 单个卡牌条目
 * 纯展示组件：接收 Card 对象 prop，渲染名称和标签
 */

import React from "react";
import type { Card } from "../../types/parser";
import { MarkBadge } from "./MarkBadge";

interface CardItemProps {
  card: Card;
  selected: boolean;
  onClick: () => void;
  onEdit?: (card: Card) => void;
  onDelete?: (card: Card) => void;
}

const itemStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-md)",
  borderBottom: "1px solid var(--color-border-default)",
  cursor: "pointer",
  transition: "background var(--transition-fast)",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const nameStyle: React.CSSProperties = {
  fontSize: "var(--font-base)",
  fontWeight: 600,
  color: "var(--color-text-primary)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const tagsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-xs)",
  flexWrap: "wrap",
};

const errorDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "var(--radius-full)",
  background: "var(--color-error)",
  flexShrink: 0,
};

const actionBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--color-text-muted)",
  cursor: "pointer",
  fontSize: "var(--font-xs)",
  padding: "2px 6px",
  borderRadius: "var(--radius-sm)",
  opacity: 0.5,
};

export const CardItem: React.FC<CardItemProps> = ({ card, selected, onClick, onEdit, onDelete }) => {
  const hasErrors = card.errors && card.errors.length > 0;

  return (
    <div
      style={{
        ...itemStyle,
        background: selected ? "var(--color-bg-active)" : "transparent",
        borderLeft: selected ? "3px solid var(--color-primary)" : "3px solid transparent",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = "var(--color-bg-hover)";
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", minWidth: 0, flex: 1 }}>
          {hasErrors && <div style={errorDotStyle} title={`${card.errors.length} 个语法错误`} />}
          <span style={nameStyle}>{card.name}</span>
        </div>
        {(onEdit || onDelete) && (
          <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
            {onEdit && (
              <button
                style={actionBtnStyle}
                onClick={(e) => { e.stopPropagation(); onEdit(card); }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.color = "var(--color-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.5"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
                title="编辑"
              >
                &#9998;
              </button>
            )}
            {onDelete && (
              <button
                style={actionBtnStyle}
                onClick={(e) => { e.stopPropagation(); onDelete(card); }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.color = "var(--color-error)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.5"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
                title="删除"
              >
                x
              </button>
            )}
          </div>
        )}
      </div>
      {card.list_tags.length > 0 && (
        <div style={tagsRowStyle}>
          {card.list_tags.map((tag) => (
            <MarkBadge key={tag} color="var(--color-secondary)" label={tag} />
          ))}
        </div>
      )}
    </div>
  );
};