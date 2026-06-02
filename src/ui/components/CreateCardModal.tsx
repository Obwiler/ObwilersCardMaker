/**
 * CreateCardModal — 新建卡牌弹窗
 * 名称、标签多选、文本输入、实时预览
 */

import React, { useState } from "react";

interface CreateCardModalProps {
  tags: string[];
  onClose: () => void;
  onSubmit: (name: string, tags: string[], text: string) => Promise<void>;
  loading: boolean;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};

const modalStyle: React.CSSProperties = {
  background: "var(--color-bg-surface)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-lg)",
  width: "600px",
  maxHeight: "80vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "var(--shadow-modal)",
};

const headerStyle: React.CSSProperties = {
  padding: "var(--space-md) var(--space-lg)",
  borderBottom: "1px solid var(--color-border-default)",
  fontSize: "var(--font-lg)",
  fontWeight: 700,
  color: "var(--color-text-primary)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const bodyStyle: React.CSSProperties = {
  padding: "var(--space-lg)",
  overflow: "auto",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
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
  minHeight: "200px",
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

const footerStyle: React.CSSProperties = {
  padding: "var(--space-md) var(--space-lg)",
  borderTop: "1px solid var(--color-border-default)",
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--space-sm)",
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

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--color-text-muted)",
  cursor: "pointer",
  fontSize: "var(--font-lg)",
  padding: 0,
  lineHeight: 1,
};

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

export const CreateCardModal: React.FC<CreateCardModalProps> = ({
  tags, onClose, onSubmit, loading,
}) => {
  const [name, setName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [text, setText] = useState("");

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onSubmit(name.trim(), selectedTags, text);
    // onClose 由父组件在 onSubmit 成功返回后控制
  };

  const isValid = name.trim().length > 0 && text.trim().length > 0;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span>新建卡牌</span>
          <button style={closeBtnStyle} onClick={onClose}>x</button>
        </div>

        <div style={bodyStyle}>
          <div>
            <div style={labelStyle}>卡牌名称</div>
            <input
              style={inputStyle}
              placeholder="输入卡牌名称..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <div style={labelStyle}>标签（多选）</div>
            <div style={tagGridStyle}>
              {tags.map((tag) => (
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
              placeholder={"条件 → 主体 → 谓词 → 宾语 → 备注\n示例：\n消耗1技力 → 自身 → 造成 → 目标1点物理伤害 → —"}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {text.trim() && (
            <div>
              <div style={labelStyle}>实时预览</div>
              <div style={previewStyle}>{text}</div>
            </div>
          )}
        </div>

        <div style={footerStyle}>
          <button style={btnStyle(false)} onClick={onClose}>取消</button>
          <button
            style={{ ...btnStyle(true), opacity: isValid && !loading ? 1 : 0.5 }}
            onClick={handleSubmit}
            disabled={!isValid || loading}
          >
            {loading ? "创建中..." : "创建卡牌"}
          </button>
        </div>
      </div>
    </div>
  );
};