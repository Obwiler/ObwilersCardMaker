/**
 * ParserPanel — 解析器面板
 * 输入框 + 即时解析 + 结果展示
 */

import React, { useState, useCallback } from "react";
import { useParser } from "../hooks/useParser";
import { ParseResult } from "./ParseResult";
import type { ParseResult as ParseResultType } from "../../types/parser";

const panelStyle: React.CSSProperties = {
  padding: "var(--space-md)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  maxWidth: "900px",
  margin: "0 auto",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const titleStyle: React.CSSProperties = {
  fontSize: "var(--heading-h2)",
  fontWeight: 700,
  color: "var(--color-text-primary)",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "200px",
  padding: "var(--space-md)",
  background: "var(--color-bg-surface)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--font-sm)",
  lineHeight: 1.7,
  resize: "vertical",
  outline: "none",
};

const nameInputStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-md)",
  background: "var(--color-bg-surface)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text-primary)",
  fontSize: "var(--font-base)",
  outline: "none",
  width: "200px",
};

const buttonStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-lg)",
  background: "var(--color-primary)",
  color: "var(--color-text-inverse)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontSize: "var(--font-sm)",
  fontWeight: 600,
  transition: "opacity var(--transition-fast)",
};

const statsStyle: React.CSSProperties = {
  fontSize: "var(--font-sm)",
  color: "var(--color-text-muted)",
  display: "flex",
  gap: "var(--space-lg)",
};

export const ParserPanel: React.FC = () => {
  const { stats, parseCard, loading } = useParser();
  const [cardName, setCardName] = useState("");
  const [cardText, setCardText] = useState("");
  const [lastResult, setLastResult] = useState<ParseResultType | null>(null);

  const handleParse = useCallback(async () => {
    if (!cardName.trim() || !cardText.trim()) return;
    const result = await parseCard(cardName.trim(), cardText);
    if (result) setLastResult(result);
  }, [cardName, cardText, parseCard]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        handleParse();
      }
    },
    [handleParse],
  );

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>语法解析器</span>
        {stats && (
          <div style={statsStyle}>
            <span>总计: {stats.total}</span>
            <span style={{ color: "var(--color-accent-green)" }}>成功: {stats.parsed}</span>
            <span style={{ color: "var(--color-error)" }}>失败: {stats.failed}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center" }}>
        <input
          style={nameInputStyle}
          placeholder="卡牌名称"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border-default)")}
        />
        <button
          style={{
            ...buttonStyle,
            opacity: loading || !cardName.trim() || !cardText.trim() ? 0.5 : 1,
          }}
          onClick={handleParse}
          disabled={loading || !cardName.trim() || !cardText.trim()}
        >
          {loading ? "解析中..." : "解析 (Ctrl+Enter)"}
        </button>
      </div>

      <textarea
        style={textareaStyle}
        placeholder={`在此输入卡牌文本...\n\n示例：\n子渊\n儒\n学者\n\n[儒者]定义：\nA：每回合开始时，若手牌少于3张，摸1张牌。`}
        value={cardText}
        onChange={(e) => setCardText(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--color-border-default)")}
      />

      {lastResult && <ParseResult result={lastResult} />}

      {!lastResult && (
        <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)", textAlign: "center", padding: "var(--space-2xl)" }}>
          输入卡牌名称和文本后点击解析，或按 Ctrl+Enter
        </div>
      )}
    </div>
  );
};