/**
 * MarkBadge — 最小原子组件
 * 接收颜色和文字，渲染统一徽章，在 TagCard / CardDetail 中复用
 */

import React from "react";

interface MarkBadgeProps {
  /** 徽章颜色（CSS 颜色值或 CSS 变量） */
  color: string;
  /** 徽章文字 */
  label: string;
  /** 可选：额外 CSS 类名 */
  className?: string;
}

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: "var(--radius-full)",
  fontSize: "var(--font-xs)",
  fontWeight: 600,
  lineHeight: "18px",
  whiteSpace: "nowrap",
  userSelect: "none",
};

export const MarkBadge: React.FC<MarkBadgeProps> = ({ color, label, className }) => {
  return (
    <span
      className={className}
      style={{
        ...badgeStyle,
        backgroundColor: `${color}22`,
        color: color,
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  );
};