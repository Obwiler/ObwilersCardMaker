/**
 * ParseResult — 解析结果展示
 * 展示单张卡牌解析后的 AST 或错误信息
 */

import React from "react";
import type { ParseResult as ParseResultType } from "../../types/parser";
import { MarkBadge } from "./MarkBadge";

interface ParseResultProps {
  result: ParseResultType;
}

const containerStyle: React.CSSProperties = {
  padding: "var(--space-md)",
  background: "var(--color-bg-surface)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-md)",
  marginTop: "var(--space-md)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "var(--font-lg)",
  fontWeight: 700,
  color: "var(--color-accent-green)",
  marginBottom: "var(--space-sm)",
};

const errorTitleStyle: React.CSSProperties = {
  fontSize: "var(--font-lg)",
  fontWeight: 700,
  color: "var(--color-error)",
  marginBottom: "var(--space-sm)",
};

const entryStyle: React.CSSProperties = {
  padding: "var(--space-sm)",
  marginBottom: "var(--space-xs)",
  background: "var(--color-bg-base)",
  borderRadius: "var(--radius-sm)",
  borderLeft: "2px solid var(--color-primary-dim)",
};

const entryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "80px 1fr",
  gap: "2px var(--space-md)",
  fontSize: "var(--font-sm)",
};

const labelStyle: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--font-xs)",
};

const valueStyle: React.CSSProperties = {
  color: "var(--color-text-primary)",
};

export const ParseResult: React.FC<ParseResultProps> = ({ result }) => {
  if (!result.ast) {
    return (
      <div style={{ ...containerStyle, borderColor: "var(--color-error)" }}>
        <div style={errorTitleStyle}>解析失败: {result.card_name}</div>
        {result.errors.map((e, i) => (
          <div key={i} style={{ color: "var(--color-error)", fontSize: "var(--font-sm)", marginBottom: 4 }}>
            行 {e.line}: {e.message}
          </div>
        ))}
      </div>
    );
  }

  const ast = result.ast;

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>解析成功: {ast.name}</div>

      {/* 标签 */}
      <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap", marginBottom: "var(--space-md)" }}>
        {ast.list_tags.map((t) => (
          <MarkBadge key={t} color="var(--color-secondary)" label={t} />
        ))}
        {ast.pre_tag.map((t) => (
          <MarkBadge key={t} color="var(--color-accent-cyan)" label={`段前:${t}`} />
        ))}
        {ast.duel_tags.map((t) => (
          <MarkBadge key={t} color="var(--color-accent-orange)" label={`对峙:${t}`} />
        ))}
      </div>

      {/* 五段式条目 */}
      {ast.entries.map((entry, idx) => (
        <div key={idx} style={entryStyle}>
          <div style={{ fontSize: "var(--font-xs)", color: "var(--color-accent-yellow)", marginBottom: 4 }}>
            段落 {idx + 1} {entry.condition ? `[条件: ${entry.condition}]` : ""}
          </div>
          <div style={entryGridStyle}>
            <span style={labelStyle}>ID</span>
            <span style={valueStyle}>{entry.id}</span>
            <span style={labelStyle}>主语</span>
            <span style={valueStyle}>{entry.subject || "-"}</span>
            <span style={labelStyle}>谓语</span>
            <span style={valueStyle}>{entry.predicate || "-"}</span>
            <span style={labelStyle}>宾语</span>
            <span style={valueStyle}>{entry.object || "-"}</span>
            <span style={labelStyle}>备注</span>
            <span style={valueStyle}>{entry.note || "-"}</span>
          </div>
        </div>
      ))}

      {/* 错误 */}
      {result.errors.length > 0 && (
        <div style={{ marginTop: "var(--space-md)", padding: "var(--space-sm)", borderTop: "1px solid var(--color-border-default)" }}>
          {result.errors.map((e, i) => (
            <div key={i} style={{ color: "var(--color-warning)", fontSize: "var(--font-xs)" }}>
              行 {e.line}: {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};