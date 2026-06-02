/**
 * CardEditor — 卡牌编辑器
 * 编辑已有卡牌的名称、标签、文本，含实时预览
 */

import React, { useState, useEffect } from "react";
import type { Card } from "../../types/parser";

interface CardEditorProps {
  card: Card;
  allTags: string[];
  onSave: (id: string, name: string, tags: string[], text: string) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  /** 防抖后的变更回调，用于 undo 快照 */
  onDebouncedChange?: (card: Card) => void;
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  padding: "var(--space-lg)",
  height: "100%",
  overflow: "auto",
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--font-sm)",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-sm) var(--space-md)",
  background: "var(--color-bg-base)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text-primary)",
  fontSize: "var(--font-sm)",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "220px",
  resize: "vertical",
  fontFamily: "monospace",
  lineHeight: 1.6,
};

const tagGridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-xs)",
};

const tagChipStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 12px",
  borderRadius: "var(--radius-full)",
  fontSize: "var(--font-xs)",
  cursor: "pointer",
  border: active ? "1px solid var(--color-primary)" : "1px solid var(--color-border-default)",
  background: active ? "var(--color-primary-glow)" : "transparent",
  color: active ? "var(--color-primary)" : "var(--color-text-muted)",
  transition: "all var(--transition-fast)",
  userSelect: "none" as const,
});

const previewStyle: React.CSSProperties = {
  padding: "var(--space-md)",
  background: "var(--color-bg-base)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--font-xs)",
  color: "var(--color-text-muted)",
  fontFamily: "monospace",
  lineHeight: 1.4,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  maxHeight: "120px",
  overflow: "auto",
};

const btnRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-sm)",
  justifyContent: "flex-end",
  marginTop: "var(--space-sm)",
};

const btnStyle = (primary: boolean): React.CSSProperties => ({
  padding: "var(--space-sm) var(--space-lg)",
  background: primary ? "var(--color-primary)" : "var(--color-bg-elevated)",
  color: primary ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
  border: primary ? "none" : "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontSize: "var(--font-sm)",
  fontWeight: 600,
});

const metaStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-lg)",
  fontSize: "var(--font-xs)",
  color: "var(--color-text-muted)",
};

export const CardEditor: React.FC<CardEditorProps> = ({
  card, allTags, onSave, onCancel, loading, onDebouncedChange,
}) => {
  const [name, setName] = useState(card.name);
  const [selectedTags, setSelectedTags] = useState<string[]>([...card.list_tags]);
  const [text, setText] = useState(card.text);

  useEffect(() => {
    setName(card.name);
    setSelectedTags([...card.list_tags]);
    setText(card.text);
  }, [card.id]);

  // 通知父组件内容变更（用于 undo 防抖快照）
  useEffect(() => {
    onDebouncedChange?.({ ...card, name, list_tags: selectedTags, text });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, selectedTags, text]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const isValid = name.trim().length > 0 && text.trim().length > 0;

  return (
    <div style={containerStyle}>
      <div style={metaStyle}>
        <span>ID: {card.id}</span>
        <span>创建: {card.created_at}</span>
        <span>修改: {card.modified_at}</span>
        {card.errors.length > 0 && (
          <span style={{ color: "var(--color-error)" }}>
            {card.errors.length} 个语法错误
          </span>
        )}
      </div>

      <div>
        <div style={labelStyle}>卡牌名称</div>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <div style={labelStyle}>标签（多选）</div>
        <div style={tagGridStyle}>
          {allTags.map((tag) => (
            <div
              key={tag}
              style={tagChipStyle(selectedTags.includes(tag))}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={labelStyle}>卡牌文本（五段式语法）</div>
        <textarea
          style={textareaStyle}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div>
        <div style={labelStyle}>实时预览</div>
        <div style={previewStyle}>{text || "(空)"}</div>
      </div>

      <div style={btnRowStyle}>
        <button style={btnStyle(false)} onClick={onCancel}>取消</button>
        <button
          style={{ ...btnStyle(true), opacity: isValid && !loading ? 1 : 0.5 }}
          onClick={() => onSave(card.id, name.trim(), selectedTags, text)}
          disabled={!isValid || loading}
        >
          {loading ? "保存中..." : "保存修改"}
        </button>
      </div>
    </div>
  );
};