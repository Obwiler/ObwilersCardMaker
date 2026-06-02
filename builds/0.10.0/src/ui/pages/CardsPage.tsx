import React, { useState } from 'react';
import { Toolbar } from '../components/Toolbar';
import { CardList } from '../components/CardList';
import { CardView } from '../components/CardView';
import { useCards } from '../hooks/useCards';
import type { CardBundle, CardMeta } from '../../ports/CardRepositoryPort';

const EMPTY_CARD_META: CardMeta = {
  id: '',
  name: '未命名卡牌',
  category: '角色',
  attributes: {},
  version: '0.1.0',
};

export const CardsPage: React.FC = () => {
  const { cards, loading, refresh, load, save, deleteCard } = useCards();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardBundle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filteredCards = cards.filter(card =>
    card.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (id: string) => {
    setSelectedCardId(id);
    const bundle = await load(id);
    setSelectedCard(bundle);
  };

  const handleNewCard = async () => {
    const newId = `card_${Date.now()}`;
    await save(newId, '', EMPTY_CARD_META);
    setSelectedCardId(newId);
    setSelectedCard(null);
  };

  const handleDelete = async () => {
    if (!selectedCardId) return;
    await deleteCard(selectedCardId);
    setSelectedCardId(null);
    setSelectedCard(null);
    setShowDeleteConfirm(false);
  };

  const handleSave = () => {
    refresh();
  };

  return (
    <div className="page-cards">
      <Toolbar
        onNewCard={handleNewCard}
        onSave={handleSave}
        onExport={() => {}}
        onBatchExport={() => {}}
        isDirty={false}
      />
      <div className="page-cards__body">
        <aside className="page-cards__sidebar">
          <div className="page-cards__search-bar">
            <input
              type="text"
              className="page-cards__search-input"
              placeholder="搜索卡牌..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="page-cards__loading">加载中...</div>
          ) : (
            <CardList
              cards={filteredCards}
              onSelect={handleSelect}
              selectedId={selectedCardId ?? undefined}
            />
          )}
        </aside>
        <main className="page-cards__main">
          <CardView
            card={selectedCard}
            onEdit={() => {}}
            onDelete={() => setShowDeleteConfirm(true)}
          />
        </main>
      </div>

      {showDeleteConfirm && (
        <div className="page-cards__overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="page-cards__dialog" onClick={e => e.stopPropagation()}>
            <p className="page-cards__dialog-text">确认删除卡牌？此操作不可恢复。</p>
            <div className="page-cards__dialog-actions">
              <button className="page-cards__dialog-btn page-cards__dialog-btn--cancel" onClick={() => setShowDeleteConfirm(false)}>
                取消
              </button>
              <button className="page-cards__dialog-btn page-cards__dialog-btn--confirm" onClick={handleDelete}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
