/**
 * EditorPage — 编辑器全页（增强版）
 * 支持 undo/redo（Ctrl+Z / Ctrl+Y）、防抖输入、工具栏按钮
 * 含导入导出、新建/删除功能
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useCards } from "../hooks/useCards";
import { CardEditor } from "../components/CardEditor";
import { CreateCardModal } from "../components/CreateCardModal";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { createUndoManager, type CardSnapshot } from "../stores/undoStore";
import type { Card } from "../../types/parser";
import { invokeExportCards, invokeImportCards } from "../../lib/tauri";

// ===== Styles =====
const containerStyle: React.CSSProperties = {
  display: "flex", height: "100%", overflow: "hidden",
};

const listPanelStyle: React.CSSProperties = {
  width: "320px", minWidth: "260px",
  borderRight: "1px solid var(--color-border-default)",
  display: "flex", flexDirection: "column", overflow: "hidden",
};

const listHeaderStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-md)",
  borderBottom: "1px solid var(--color-border-default)",
  display: "flex", justifyContent: "space-between", alignItems: "center",
};

const listTitleStyle: React.CSSProperties = {
  fontSize: "var(--font-base)", fontWeight: 700, color: "var(--color-text-primary)",
};

const btnStyle = (primary: boolean): React.CSSProperties => ({
  padding: "var(--space-xs) var(--space-sm)",
  background: primary ? "var(--color-primary)" : "transparent",
  color: primary ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
  border: primary ? "none" : "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer", fontSize: "var(--font-xs)", fontWeight: 600,
});

const undoBtnStyle = (enabled: boolean): React.CSSProperties => ({
  ...btnStyle(false),
  opacity: enabled ? 1 : 0.35,
  cursor: enabled ? "pointer" : "not-allowed",
});

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-sm) var(--space-md)",
  background: "var(--color-bg-base)",
  border: "none", borderBottom: "1px solid var(--color-border-default)",
  color: "var(--color-text-primary)", fontSize: "var(--font-sm)", outline: "none",
};

const listStyle: React.CSSProperties = { flex: 1, overflow: "auto" };

const cardItemStyle = (active: boolean): React.CSSProperties => ({
  padding: "var(--space-sm) var(--space-md)",
  borderBottom: "1px solid var(--color-border-default)",
  cursor: "pointer",
  display: "flex", justifyContent: "space-between", alignItems: "center",
  background: active ? "var(--color-bg-active)" : "transparent",
  borderLeft: active ? "3px solid var(--color-primary)" : "3px solid transparent",
  transition: "background var(--transition-fast)",
});

const toolbarStyle: React.CSSProperties = {
  display: "flex", gap: "var(--space-xs)", alignItems: "center",
  padding: "var(--space-xs) var(--space-md)",
  borderBottom: "1px solid var(--color-border-default)",
};

const editorPanelStyle: React.CSSProperties = { flex: 1, overflow: "hidden" };

const emptyStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", height: "100%",
  color: "var(--color-text-muted)", gap: "var(--space-md)",
};

// ===== Component =====
export const EditorPage: React.FC = () => {
  const { cards, loading, error, refresh, createCard, updateCard, deleteCard } = useCards();

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ---- Undo/Redo ----
  const undoManager = useRef(createUndoManager());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotRef = useRef<CardSnapshot | null>(null);

  const snapshotCard = useCallback((card: Card | null): CardSnapshot | null => {
    if (!card) return null;
    return { name: card.name, tags: [...card.list_tags], text: card.text };
  }, []);

  // 防抖后推送快照到 undo 栈
  const pushSnapshot = useCallback((card: Card | null) => {
    const snap = snapshotCard(card);
    if (!snap) return;
    // 避免完全相同的内容重复推
    if (lastSnapshotRef.current &&
        lastSnapshotRef.current.name === snap.name &&
        lastSnapshotRef.current.text === snap.text &&
        JSON.stringify(lastSnapshotRef.current.tags) === JSON.stringify(snap.tags)) {
      return;
    }
    lastSnapshotRef.current = snap;
    undoManager.current.push(snap);
    setCanUndo(undoManager.current.canUndo());
    setCanRedo(undoManager.current.canRedo());
  }, [snapshotCard]);

  // 执行 undo
  const handleUndo = useCallback(() => {
    if (!selectedCard || !undoManager.current.canUndo()) return;
    const current = snapshotCard(selectedCard);
    if (!current) return;
    const prev = undoManager.current.undo(current);
    setCanUndo(undoManager.current.canUndo());
    setCanRedo(undoManager.current.canRedo());
    if (prev) {
      setSelectedCard({ ...selectedCard, name: prev.name, list_tags: prev.tags, text: prev.text });
    }
  }, [selectedCard, snapshotCard]);

  // 执行 redo
  const handleRedo = useCallback(() => {
    if (!selectedCard || !undoManager.current.canRedo()) return;
    const current = snapshotCard(selectedCard);
    if (!current) return;
    const next = undoManager.current.redo(current);
    setCanUndo(undoManager.current.canUndo());
    setCanRedo(undoManager.current.canRedo());
    if (next) {
      setSelectedCard({ ...selectedCard, name: next.name, list_tags: next.tags, text: next.text });
    }
  }, [selectedCard, snapshotCard]);

  // 切换选中卡牌时重置 undo 栈并拍快照
  const selectCard = useCallback((card: Card) => {
    undoManager.current.clear();
    lastSnapshotRef.current = null;
    setCanUndo(false);
    setCanRedo(false);
    setSelectedCard(card);
    // 延迟推送初始快照
    setTimeout(() => pushSnapshot(card), 0);
  }, [pushSnapshot]);

  // ---- 键盘快捷键 ----
  useKeyboardShortcuts([
    { key: "z", ctrl: true, description: "撤销", handler: handleUndo },
    { key: "y", ctrl: true, description: "重做", handler: handleRedo },
    { key: "n", ctrl: true, description: "新建卡牌", handler: () => setShowCreateModal(true) },
    { key: "f", ctrl: true, description: "聚焦搜索框", handler: () => searchInputRef.current?.focus() },
    {
      key: "s", ctrl: true, description: "保存",
      handler: () => {
        if (selectedCard) {
          updateCard(selectedCard.id, selectedCard.name, selectedCard.list_tags, selectedCard.text);
        }
      },
    },
  ]);

  // ---- 数据 ----
  const allTags = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => c.list_tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (!search.trim()) return cards;
    const q = search.toLowerCase();
    return cards.filter((c) => c.name.toLowerCase().includes(q));
  }, [cards, search]);

  // ---- 操作处理 ----
  const handleCreate = async (name: string, tags: string[], text: string) => {
    setActionLoading(true);
    const result = await createCard(name, tags, text);
    setActionLoading(false);
    if (result) setShowCreateModal(false);
  };

  const handleDelete = async (card: Card) => {
    if (!confirm(`确定要删除「${card.name}」吗？此操作不可撤销。`)) return;
    setActionLoading(true);
    await deleteCard(card.id);
    setActionLoading(false);
    if (selectedCard?.id === card.id) setSelectedCard(null);
  };

  // 防抖更新（在 CardEditor 的 onChange 中触发）
  const handleDebouncedChange = useCallback((card: Card) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushSnapshot(card);
    }, 300);
  }, [pushSnapshot]);

  // CardEditor onSave 时也推送快照
  const handleCardSave = useCallback(async (id: string, name: string, tags: string[], text: string) => {
    setActionLoading(true);
    await updateCard(id, name, tags, text);
    setActionLoading(false);
    setSelectedCard((prev) => {
      if (!prev) return null;
      const updated = { ...prev, name, list_tags: tags, text };
      // 保存后清理 undo 栈（已持久化）
      undoManager.current.clear();
      lastSnapshotRef.current = null;
      setCanUndo(false);
      setCanRedo(false);
      return updated;
    });
  }, [updateCard]);

  // ---- 导入导出 ----
  const handleExport = async () => {
    const idsToExport = filteredCards.map((c) => c.id);
    if (idsToExport.length === 0) return;
    const result = await invokeExportCards(idsToExport);
    if (result.ok) {
      const blob = new Blob([result.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cardmaker_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading(true);
    setImportStatus(null);
    try {
      const text = await file.text();
      const result = await invokeImportCards(text);
      if (result.ok) {
        const r = result.data;
        setImportStatus(`导入完成: ${r.imported} 张新卡牌, ${r.skipped} 张跳过`);
        await refresh();
      } else {
        setImportStatus(`导入失败: ${result.error}`);
      }
    } catch (err) {
      setImportStatus(`读取文件失败: ${String(err)}`);
    }
    setActionLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 清理防抖
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // ===== Render =====
  if (loading) {
    return (
      <div className="status-container">
        <div className="status-text">加载卡牌数据...</div>
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
      {/* ===== 左侧列表 ===== */}
      <div style={listPanelStyle}>
        <div style={listHeaderStyle}>
          <span style={listTitleStyle}>卡牌列表 ({cards.length})</span>
          <div style={{ display: "flex", gap: "var(--space-xs)" }}>
            <button style={btnStyle(false)} onClick={handleExport} title="导出当前筛选的卡牌">导出</button>
            <button style={btnStyle(false)} onClick={handleImportClick} title="从 JSON 文件导入">导入</button>
            <button style={btnStyle(true)} onClick={() => setShowCreateModal(true)}>+ 新建</button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file" accept=".json"
          style={{ display: "none" }}
          onChange={handleImportFile}
        />
        <input
          ref={searchInputRef}
          style={searchInputStyle}
          placeholder="搜索卡牌... (Ctrl+F)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {importStatus && (
          <div style={{
            marginTop: "var(--space-xs)", padding: "var(--space-xs) var(--space-md)",
            borderRadius: "var(--radius-sm)",
            background: importStatus.startsWith("导入完成") ? "rgba(40,167,69,0.1)" : "rgba(255,68,68,0.1)",
            color: "var(--color-text-secondary)", fontSize: "var(--font-xs)",
          }}>
            {importStatus}
          </div>
        )}

        {/* Undo/Redo 工具栏 */}
        <div style={toolbarStyle}>
          <button style={undoBtnStyle(canUndo)} onClick={handleUndo} disabled={!canUndo} title="撤销 (Ctrl+Z)">
            &#x21A9;
          </button>
          <button style={undoBtnStyle(canRedo)} onClick={handleRedo} disabled={!canRedo} title="重做 (Ctrl+Y)">
            &#x21AA;
          </button>
        </div>

        <div style={listStyle}>
          {filteredCards.map((card) => (
            <div
              key={card.id}
              style={cardItemStyle(selectedCard?.id === card.id)}
              onClick={() => selectCard(card)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "var(--font-sm)", fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {card.name}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {card.list_tags.map((t) => <span key={t}>#{t}</span>)}
                </div>
              </div>
              <button
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "var(--font-sm)", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}
                onClick={(e) => { e.stopPropagation(); handleDelete(card); }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "var(--color-error)"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "var(--color-text-muted)"; }}
                title="删除卡牌"
              >
                x
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 右侧编辑器 ===== */}
      <div style={editorPanelStyle}>
        {selectedCard ? (
          <CardEditor
            key={selectedCard.id}
            card={selectedCard}
            allTags={allTags}
            onSave={handleCardSave}
            onCancel={() => setSelectedCard(null)}
            loading={actionLoading}
            onDebouncedChange={handleDebouncedChange}
          />
        ) : (
          <div style={emptyStyle}>
            <div style={{ fontSize: "var(--font-xl)", color: "var(--color-text-muted)" }}>+</div>
            <span>选择卡牌编辑，或点击「新建」(Ctrl+N) 创建卡牌</span>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateCardModal
          tags={allTags}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          loading={actionLoading}
        />
      )}
    </div>
  );
};
