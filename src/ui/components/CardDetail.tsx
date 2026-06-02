/**
 * CardDetail — 卡牌详情（五段式展示）
 * 纯展示组件：接收 Card 对象 prop
 * 段落可折叠/展开
 */

import React, { useState } from "react";
import type { Card } from "../../types/parser";
import { MarkBadge } from "./MarkBadge";

interface CardDetailProps {
  card: Card;
}

const sectionStyle: React.CSSProperties = {
  marginBottom: "var(--space-sm)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-md)",
  overflow: "hidden",
};

const sectionHeaderStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-md)",
  background: "var(--color-bg-elevated)",
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  userSelect: "none",
  fontSize: "var(--font-sm)",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
};

const sectionBodyStyle: React.CSSProperties = {
  padding: "var(--space-md)",
  background: "var(--color-bg-surface)",
};

const entryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1fr",
  gap: "4px var(--space-md)",
  fontSize: "var(--font-sm)",
};

const entryLabelStyle: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--font-xs)",
};

const entryValueStyle: React.CSSProperties = {
  color: "var(--color-text-primary)",
};

const tagDefEntryStyle: React.CSSProperties = {
  padding: "var(--space-sm)",
  marginBottom: "var(--space-xs)",
  background: "var(--color-bg-base)",
  borderRadius: "var(--radius-sm)",
  borderLeft: "2px solid var(--color-secondary)",
};

const phaseLabel = ["描述段", "条件段", "效果段", "结算段", "备注段"];

export const CardDetail: React.FC<CardDetailProps> = ({ card }) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const entries = card.ast?.entries ?? [];
  const tagDefs = card.ast?.tag_defs ?? [];

  return (
    <div style={{ padding: "var(--space-md)", overflow: "auto", height: "100%" }}>
      {/* 卡牌名称 + 标签 */}
      <div style={{ marginBottom: "var(--space-md)" }}>
        <h2 style={{ fontSize: "var(--heading-h2)", fontWeight: 700, color: "var(--color-primary)", marginBottom: "var(--space-sm)" }}>
          {card.name}
        </h2>
        <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
          {card.list_tags.map((t) => (
            <MarkBadge key={t} color="var(--color-secondary)" label={t} />
          ))}
          {card.pre_tag.map((t) => (
            <MarkBadge key={t} color="var(--color-accent-cyan)" label={`段前:${t}`} />
          ))}
          {card.duel_tags.map((t) => (
            <MarkBadge key={t} color="var(--color-accent-orange)" label={`对峙:${t}`} />
          ))}
        </div>
      </div>

      {/* 错误提示 */}
      {card.errors && card.errors.length > 0 && (
        <div style={{ padding: "var(--space-sm) var(--space-md)", background: `${"var(--color-error)"}15`, border: "1px solid var(--color-error)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-md)", fontSize: "var(--font-sm)", color: "var(--color-error)" }}>
          {card.errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {/* 五段式条目 */}
      <h3 style={{ fontSize: "var(--font-lg)", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "var(--space-sm)" }}>
        五段式语法
      </h3>
      {entries.length === 0 && (
        <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)", padding: "var(--space-md)" }}>
          暂无解析数据
        </div>
      )}
      {entries.map((entry, idx) => {
        const key = `entry-${idx}`;
        const isOpen = !collapsed[key];
        return (
          <div key={key} style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggle(key)}>
              <span>
                {phaseLabel[idx] ?? `段落 ${idx + 1}`}
                {entry.condition && (
                  <span style={{ marginLeft: "var(--space-sm)", color: "var(--color-accent-yellow)", fontWeight: 400 }}>
                    条件: {entry.condition}
                  </span>
                )}
              </span>
              <span style={{ color: "var(--color-text-muted)" }}>{isOpen ? "▾" : "▸"}</span>
            </div>
            {isOpen && (
              <div style={sectionBodyStyle}>
                <div style={entryGridStyle}>
                  <span style={entryLabelStyle}>ID</span>
                  <span style={entryValueStyle}>{entry.id}</span>
                  <span style={entryLabelStyle}>主语</span>
                  <span style={entryValueStyle}>{entry.subject || "-"}</span>
                  <span style={entryLabelStyle}>谓语</span>
                  <span style={entryValueStyle}>{entry.predicate || "-"}</span>
                  <span style={entryLabelStyle}>宾语</span>
                  <span style={entryValueStyle}>{entry.object || "-"}</span>
                  <span style={entryLabelStyle}>条件</span>
                  <span style={entryValueStyle}>{entry.condition || "-"}</span>
                  <span style={entryLabelStyle}>备注</span>
                  <span style={entryValueStyle}>{entry.note || "-"}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 标签定义块 */}
      {tagDefs.length > 0 && (
        <>
          <h3 style={{ fontSize: "var(--font-lg)", fontWeight: 600, color: "var(--color-text-secondary)", margin: "var(--space-lg) 0 var(--space-sm)" }}>
            标签定义块
          </h3>
          {tagDefs.map((td, i) => {
            const key = `tagdef-${i}`;
            const isOpen = !collapsed[key];
            return (
              <div key={key} style={sectionStyle}>
                <div style={sectionHeaderStyle} onClick={() => toggle(key)}>
                  <span>[{td.tag_name}] 定义</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{isOpen ? "▾" : "▸"}</span>
                </div>
                {isOpen && (
                  <div style={sectionBodyStyle}>
                    {td.entries.map((entry, j) => (
                      <div key={j} style={tagDefEntryStyle}>
                        <div style={entryGridStyle}>
                          <span style={entryLabelStyle}>等级</span>
                          <span style={{ ...entryValueStyle, fontWeight: 600, color: "var(--color-accent-yellow)" }}>{entry.id}</span>
                          <span style={entryLabelStyle}>主语</span>
                          <span style={entryValueStyle}>{entry.subject || "-"}</span>
                          <span style={entryLabelStyle}>谓语</span>
                          <span style={entryValueStyle}>{entry.predicate || "-"}</span>
                          <span style={entryLabelStyle}>宾语</span>
                          <span style={entryValueStyle}>{entry.object || "-"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};