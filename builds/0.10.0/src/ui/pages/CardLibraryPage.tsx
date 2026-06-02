import React, { useState } from 'react';
import { useCards } from '../hooks/useCards';

interface Props { onEdit: (id: string) => void }

export const CardLibraryPage: React.FC<Props> = ({ onEdit }) => {
  const { cards, loading, error, refresh, deleteCard } = useCards();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const categories = [...new Set(cards.map(c => c.category).filter(Boolean))];

  const filtered = cards.filter(c => {
    const matchSearch = !search || c.name.includes(search) || c.id.includes(search);
    const matchCat = !filterCat || c.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <div style={toolbarStyle}>
        <input
          placeholder="搜索卡牌名称或ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
        />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={selectStyle}>
          <option value="">全部类型</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={refresh} style={btnSecondaryStyle}>刷新</button>
        <span style={{ color: '#8b949e', fontSize: 12 }}>
          {loading ? '加载中...' : error ? `错误: ${error}` : `${filtered.length} 张卡`}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {filtered.map(card => (
          <div
            key={card.id}
            style={cardItemStyle}
            onClick={() => onEdit(card.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') onEdit(card.id); }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#e6edf3' }}>{card.name}</div>
                <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>{card.id}</div>
              </div>
              <span style={{
                padding: '1px 6px',
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 500,
                background: catBg(card.category),
                color: catFg(card.category),
              }}>
                {card.category}
              </span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#484f58' }}>v{card.version}</span>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(card.id); }}
                style={delBtnStyle}
              >
                删除
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ width: '100%', textAlign: 'center', padding: 40, color: '#484f58' }}>
            {loading ? '加载中...' : '暂无匹配卡牌'}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div style={overlayStyle} onClick={() => setConfirmDelete(null)}>
          <div style={dialogStyle} onClick={e => e.stopPropagation()}>
            <p style={{ margin: '0 0 12px' }}>确认删除 {confirmDelete}？此操作不可恢复。</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={btnSecondaryStyle}>取消</button>
              <button
                onClick={async () => { await deleteCard(confirmDelete); setConfirmDelete(null); }}
                style={{ ...btnPrimaryStyle, background: '#da3633' }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const catBg = (c: string): string => {
  const map: Record<string, string> = {
    '阵营': '#1a3a5c', '阵营卡': '#1a3a5c', '职业': '#3d2b5c', '职业卡': '#3d2b5c',
    '兵刃': '#5c1a1a', '宝器': '#5c5c1a', '甲胄': '#1a5c1a',
    '武学': '#1a1a5c', '术法': '#5c1a5c', '基本牌': '#2c2c3c',
  };
  return map[c] ?? '#30363d';
};

const catFg = (c: string): string => {
  const map: Record<string, string> = {
    '阵营': '#58a6ff', '阵营卡': '#58a6ff', '职业': '#bc8cff', '职业卡': '#bc8cff',
    '兵刃': '#f7786b', '宝器': '#e3b341', '甲胄': '#7ee787',
    '武学': '#79c0ff', '术法': '#d2a8ff', '基本牌': '#8b949e',
  };
  return map[c] ?? '#c9d1d9';
};

const toolbarStyle: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' };
const inputStyle: React.CSSProperties = { padding: '6px 12px', background: '#21262d', border: '1px solid #30363d', borderRadius: 6, color: '#c9d1d9', fontSize: 13, flex: 1, minWidth: 180 };
const selectStyle: React.CSSProperties = { ...inputStyle, flex: 'none', width: 120 };
const btnPrimaryStyle: React.CSSProperties = { padding: '6px 14px', background: '#238636', border: '1px solid rgba(240,246,252,.1)', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12 };
const btnSecondaryStyle: React.CSSProperties = { ...btnPrimaryStyle, background: '#21262d', color: '#c9d1d9' };
const delBtnStyle: React.CSSProperties = { padding: '2px 8px', background: 'transparent', border: '1px solid #30363d', borderRadius: 4, color: '#8b949e', cursor: 'pointer', fontSize: 10 };
const cardItemStyle: React.CSSProperties = {
  width: 200, padding: 12, background: '#161b22', border: '1px solid #21262d', borderRadius: 8, cursor: 'pointer',
  transition: 'border-color 0.15s',
};
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const dialogStyle: React.CSSProperties = { background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: 24, maxWidth: 380 };
