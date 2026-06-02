/**
 * CardPanel — 卡牌列表面板（增强版）
 * 搜索（名称+效果文本）、标签多选、排序、列表/网格视图切换
 * 数据来自 useCards()
 */

import React, { useState, useMemo, useCallback, useRef } from "react";
import { FixedSizeList as List } from "react-window";
import { useCards } from "../hooks/useCards";
import { CardItem } from "./CardItem";
import { CardDetail } from "./CardDetail";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import type { Card } from "../../types/parser";
import type { DuplicatePair } from "../../types/data_gov";
import { invokeDetectDuplicates } from "../../lib/tauri";

// 虚拟滚动阈值
const VIRTUAL_LIST_THRESHOLD = 200;
const ROW_HEIGHT = 60;

// ===== Memoized CardItem =====
const MemoCardItem = React.memo(CardItem);

// ===== Styles =====
const containerStyle: React.CSSProperties = {
  display: "flex", height: "100%", overflow: "hidden",
};

const listPanelStyle: React.CSSProperties = {
  width: "360px", minWidth: "300px",
  borderRight: "1px solid var(--color-border-default)",
  display: "flex", flexDirection: "column", overflow: "hidden",
};

const searchBarStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-md)",
  borderBottom: "1px solid var(--color-border-default)",
  display: "flex", flexDirection: "column", gap: "var(--space-xs)",
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

const filterRowStyle: React.CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: "var(--space-xs)", alignItems: "center",
};

const toolbarStyle: React.CSSProperties = {
  display: "flex", gap: "var(--space-xs)", alignItems: "center",
  padding: "var(--space-xs) var(--space-md)",
  borderBottom: "1px solid var(--color-border-default)",
  fontSize: "var(--font-xs)",
  color: "var(--color-text-muted)",
};

const sortSelectStyle: React.CSSProperties = {
  padding: "2px 8px",
  background: "var(--color-bg-base)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text-primary)",
  fontSize: "var(--font-xs)",
  outline: "none",
  cursor: "pointer",
};

const viewBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: "2px 8px",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontSize: "var(--font-xs)",
  border: active ? "1px solid var(--color-primary)" : "1px solid var(--color-border-default)",
  background: active ? "var(--color-primary-glow)" : "transparent",
  color: active ? "var(--color-primary)" : "var(--color-text-muted)",
  userSelect: "none" as const,
});

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: "2px 8px",
  borderRadius: "var(--radius-full)",
  fontSize: "var(--font-xs)",
  cursor: "pointer",
  border: active ? "1px solid var(--color-primary)" : "1px solid var(--color-border-default)",
  background: active ? "var(--color-primary-glow)" : "transparent",
  color: active ? "var(--color-primary)" : "var(--color-text-muted)",
  transition: "all var(--transition-fast)",
  userSelect: "none" as const,
  whiteSpace: "nowrap",
});

const listStyle: React.CSSProperties = { flex: 1, overflow: "auto" };

const gridContainerStyle: React.CSSProperties = {
  flex: 1, overflow: "auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "var(--space-sm)",
  padding: "var(--space-sm)",
  alignContent: "start",
};

const gridCardStyle = (selected: boolean): React.CSSProperties => ({
  padding: "var(--space-sm) var(--space-md)",
  borderRadius: "var(--radius-md)",
  border: selected ? "2px solid var(--color-primary)" : "1px solid var(--color-border-default)",
  background: selected ? "var(--color-primary-glow)" : "var(--color-bg-surface)",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minHeight: "80px",
  transition: "all var(--transition-fast)",
});

const dupBtnStyle: React.CSSProperties = {
  padding: "2px 10px",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--font-xs)",
  cursor: "pointer",
  border: "1px solid var(--color-warning, #f0ad4e)",
  background: "transparent",
  color: "var(--color-warning, #f0ad4e)",
  userSelect: "none" as const,
};

const dupOverlayStyle: React.CSSProperties = {
  position: "fixed" as const,
  top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000,
};

const dupModalStyle: React.CSSProperties = {
  background: "var(--color-bg-elevated, #1e1e2e)",
  borderRadius: "var(--radius-lg, 12px)",
  padding: "var(--space-xl, 24px)",
  maxWidth: "600px", width: "90%", maxHeight: "80vh", overflow: "auto",
  color: "var(--color-text-primary)",
};

const detailStyle: React.CSSProperties = { flex: 1, overflow: "hidden" };

// ===== Types =====
type SortBy = "name" | "created" | "modified";
type ViewMode = "list" | "grid";

// ===== Component =====
export const CardPanel: React.FC = () => {
  const { cards, loading, error, refresh, deleteCard, saveCards } = useCards();

  const [search, setSearch] = useState("");
  const [searchEffect, setSearchEffect] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ctrl+F 聚焦搜索框
  useKeyboardShortcuts([
    { key: "f", ctrl: true, description: "聚焦搜索", handler: () => searchInputRef.current?.focus() },
  ]);

  // 重复检测状态
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [detectingDuplicates, setDetectingDuplicates] = useState(false);

  const handleDelete = useCallback(async (card: Card) => {
    await deleteCard(card.id);
    await saveCards();
    await refresh();
    if (selectedCard?.id === card.id) setSelectedCard(null);
  }, [deleteCard, saveCards, refresh, selectedCard]);

  const handleDetectDuplicates = useCallback(async () => {
    setDetectingDuplicates(true);
    const result = await invokeDetectDuplicates();
    if (result.ok) {
      setDuplicates(result.data);
      setShowDuplicates(true);
    }
    setDetectingDuplicates(false);
  }, []);

  // 所有标签
  const allTags = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => c.list_tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [cards]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }, []);

  // 过滤 + 排序
  const filteredCards = useMemo(() => {
    let result = cards.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (searchEffect && !c.text.toLowerCase().includes(searchEffect.toLowerCase())) return false;
      if (selectedTags.size > 0 && !c.list_tags.some((t) => selectedTags.has(t))) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "created": return a.created_at.localeCompare(b.created_at);
        case "modified": return b.modified_at.localeCompare(a.modified_at);
        default: return 0;
      }
    });

    return result;
  }, [cards, search, searchEffect, selectedTags, sortBy]);

  // ===== Render =====
  if (loading) {
    return (
      <div className="status-container">
        <div className="status-text">加载卡牌数据...</div>
        <div className="skeleton" style={{ width: 200, height: 20 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-container">
        <div className="status-text">加载失败: {error}</div>
        <button className="status-retry" onClick={refresh}>重试</button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* ===== 左侧面板 ===== */}
      <div style={listPanelStyle}>
        {/* 搜索栏 */}
        <div style={searchBarStyle}>
          <input
            ref={searchInputRef}
            style={inputStyle}
            placeholder="搜索卡牌名称... (Ctrl+F)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--color-border-default)")}
          />
          <input
            style={{ ...inputStyle, fontSize: "var(--font-xs)" }}
            placeholder="按效果文本搜索..."
            value={searchEffect}
            onChange={(e) => setSearchEffect(e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--color-border-default)")}
          />
          <div style={filterRowStyle}>
            <span
              style={chipStyle(selectedTags.size === 0)}
              onClick={() => setSelectedTags(new Set())}
            >
              全部 ({cards.length})
            </span>
            {allTags.slice(0, 12).map((tag) => (
              <span
                key={tag}
                style={chipStyle(selectedTags.has(tag))}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </span>
            ))}
            {allTags.length > 12 && (
              <span style={{ ...chipStyle(false), cursor: "default" }}>
                +{allTags.length - 12}
              </span>
            )}
          </div>
        </div>

        {/* 工具栏：排序 + 视图切换 + 重复检测 */}
        <div style={toolbarStyle}>
          <span>{filteredCards.length} 张</span>
          <select
            style={sortSelectStyle}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
          >
            <option value="name">按名称</option>
            <option value="created">按创建时间</option>
            <option value="modified">按修改时间</option>
          </select>
          <div style={{ flex: 1 }} />
          <button style={viewBtnStyle(viewMode === "list")} onClick={() => setViewMode("list")}>
            &#9776;
          </button>
          <button style={viewBtnStyle(viewMode === "grid")} onClick={() => setViewMode("grid")}>
            &#9638;
          </button>
          <button
            style={dupBtnStyle}
            onClick={handleDetectDuplicates}
            disabled={detectingDuplicates}
            title="检测重复卡牌"
          >
            {detectingDuplicates ? "..." : "去重"}
          </button>
        </div>

        {/* 列表或网格 */}
        {viewMode === "list" ? (
          filteredCards.length === 0 ? (
            <div className="status-container">
              <div className="status-text">无匹配卡牌</div>
            </div>
          ) : filteredCards.length > VIRTUAL_LIST_THRESHOLD ? (
            /* 虚拟滚动：卡片超过 200 时启用 react-window */
            <List
              height={Math.min(filteredCards.length * ROW_HEIGHT, 600)}
              itemCount={filteredCards.length}
              itemSize={ROW_HEIGHT}
              width="100%"
              style={{ overflowX: "hidden" }}
            >
              {({ index, style }) => {
                const card = filteredCards[index];
                return (
                  <div style={style}>
                    <MemoCardItem
                      card={card}
                      selected={selectedCard?.id === card.id}
                      onClick={() => setSelectedCard(card)}
                      onDelete={handleDelete}
                    />
                  </div>
                );
              }}
            </List>
          ) : (
            <div style={listStyle}>
              {filteredCards.map((card) => (
                <MemoCardItem
                  key={card.id}
                  card={card}
                  selected={selectedCard?.id === card.id}
                  onClick={() => setSelectedCard(card)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )
        ) : (
          <div style={gridContainerStyle}>
            {filteredCards.length === 0 ? (
              <div className="status-container" style={{ gridColumn: "1 / -1" }}>
                <div className="status-text">无匹配卡牌</div>
              </div>
            ) : (
              filteredCards.map((card) => (
                <div
                  key={card.id}
                  style={gridCardStyle(selectedCard?.id === card.id)}
                  onClick={() => setSelectedCard(card)}
                >
                  <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card.name}
                  </div>
                  <div style={{ display: "flex", gap: "2px", flexWrap: "wrap" }}>
                    {card.list_tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        style={{
                          padding: "1px 6px", borderRadius: "var(--radius-full)",
                          fontSize: "10px", background: "var(--color-bg-hover)", color: "var(--color-text-muted)",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                    {card.list_tags.length > 4 && (
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>+{card.list_tags.length - 4}</span>
                    )}
                  </div>
                  {card.errors.length > 0 && (
                    <div style={{ color: "var(--color-error)", fontSize: "10px", marginTop: "auto" }}>
                      {card.errors.length} err
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ===== 右侧详情 ===== */}
      <div style={detailStyle}>
        {selectedCard ? (
          <CardDetail card={selectedCard} />
        ) : (
          <div className="status-container" style={{ height: "100%" }}>
            <div className="status-text">选择一张卡牌查看详情</div>
          </div>
        )}
      </div>

      {/* ===== 重复检测弹窗 ===== */}
      {showDuplicates && (
        <div style={dupOverlayStyle} onClick={() => setShowDuplicates(false)}>
          <div style={dupModalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
              <span style={{ fontWeight: 700, fontSize: "var(--font-base)" }}>重复检测结果</span>
              <button
                style={{ ...dupBtnStyle, border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}
                onClick={() => setShowDuplicates(false)}
              >
                关闭
              </button>
            </div>
            {duplicates.length === 0 ? (
              <div style={{ padding: "var(--space-lg)", textAlign: "center", color: "var(--color-text-muted)" }}>
                未发现重复卡牌
              </div>
            ) : (
              <div>
                <div style={{ padding: "var(--space-sm) var(--space-md)", fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                  共 {duplicates.length} 对疑似重复
                </div>
                {duplicates.map((pair, i) => (
                  <div key={i} style={{ padding: "var(--space-sm) var(--space-md)", borderBottom: "1px solid var(--color-border-default)", fontSize: "var(--font-sm)" }}>
                    <strong>{pair.card_a_name}</strong>
                    <span style={{ color: "var(--color-text-muted)", margin: "0 4px" }}>({pair.card_a_id})</span>
                    <span style={{ color: "var(--color-text-muted)", margin: "0 4px" }}>vs</span>
                    <strong>{pair.card_b_name}</strong>
                    <span style={{ color: "var(--color-text-muted)", margin: "0 4px" }}>({pair.card_b_id})</span>
                    <span style={{
                      display: "inline-block", padding: "1px 8px", borderRadius: "var(--radius-full)",
                      fontSize: "var(--font-xs)", marginLeft: "8px",
                      background: pair.reason === "both" ? "rgba(255,68,68,0.15)" : "rgba(240,173,78,0.15)",
                      color: pair.reason === "both" ? "var(--color-error)" : "var(--color-warning, #f0ad4e)",
                    }}>
                      {pair.reason === "both" ? "名称+文本" : pair.reason === "name" ? "同名" : "同文本"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
