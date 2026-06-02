/**
 * TagPanel — 标签面板
 * 网格布局展示所有 TagCard，数据来自 useTags().tags
 */

import React from "react";
import { useTags } from "../hooks/useTags";
import { TagCard } from "./TagCard";

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "var(--space-md)",
  padding: "var(--space-md)",
};

const headerStyle: React.CSSProperties = {
  padding: "var(--space-md) var(--space-md) 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const titleStyle: React.CSSProperties = {
  fontSize: "var(--heading-h2)",
  fontWeight: 700,
  color: "var(--color-text-primary)",
};

const countStyle: React.CSSProperties = {
  fontSize: "var(--font-sm)",
  color: "var(--color-text-muted)",
};

export const TagPanel: React.FC = () => {
  const { tags, loading, error, refresh } = useTags();

  if (loading) {
    return (
      <div className="status-container">
        <div className="status-text">加载标签数据...</div>
        <div className="skeleton" style={{ width: 200, height: 20 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-container">
        <div className="status-text">加载失败: {error}</div>
        <button className="status-retry" onClick={refresh}>
          重试
        </button>
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="status-container">
        <div className="status-text">暂无标签数据</div>
        <button className="status-retry" onClick={refresh}>
          刷新
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={headerStyle}>
        <span style={titleStyle}>标签字典</span>
        <span style={countStyle}>共 {tags.length} 个标签</span>
      </div>
      <div style={gridStyle}>
        {tags.map((tag) => (
          <TagCard key={tag.tag_id} tag={tag} />
        ))}
      </div>
    </div>
  );
};