import React, { useState } from 'react';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { CardLibraryPage } from './ui/pages/CardLibraryPage';
import { CardEditorPage } from './ui/pages/CardEditorPage';
import { BatchExportPage } from './ui/pages/BatchExportPage';
import { DuelPage } from './ui/pages/DuelPage';
import { SettingsPage } from './ui/pages/SettingsPage';

type Tab = 'library' | 'editor' | 'export' | 'duel' | 'settings';

const tabs: { id: Tab; label: string }[] = [
  { id: 'library', label: '卡牌库' },
  { id: 'editor', label: '编辑器' },
  { id: 'export', label: '批量导出' },
  { id: 'duel', label: '对战' },
  { id: 'settings', label: '设置' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [editCardId, setEditCardId] = useState<string | null>(null);

  const handleEditCard = (id: string) => {
    setEditCardId(id);
    setActiveTab('editor');
  };

  const handleCloseEditor = () => {
    setEditCardId(null);
    setActiveTab('library');
  };

  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: 'system-ui, sans-serif' }}>
        <header style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#58a6ff' }}>DZ CardMaker 0.10.0</h1>
          <nav style={{ display: 'flex', gap: 2 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  ...tabStyle,
                  background: activeTab === t.id ? '#21262d' : 'transparent',
                  color: activeTab === t.id ? '#f0f6fc' : '#8b949e',
                  borderBottom: activeTab === t.id ? '2px solid #58a6ff' : '2px solid transparent',
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px' }}>
          {activeTab === 'library' && <CardLibraryPage onEdit={handleEditCard} />}
          {activeTab === 'editor' && <CardEditorPage cardId={editCardId} onClose={handleCloseEditor} />}
          {activeTab === 'export' && <BatchExportPage />}
          {activeTab === 'duel' && <DuelPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </ErrorBoundary>
  );
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 24px',
  height: 48,
  background: '#161b22',
  borderBottom: '1px solid #30363d',
};

const tabStyle: React.CSSProperties = {
  padding: '12px 16px',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  background: 'transparent',
  transition: 'all 0.15s',
};

export default App;
