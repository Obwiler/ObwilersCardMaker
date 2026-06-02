import React from 'react';
import type { CardMeta } from '../../ports/CardRepositoryPort';

interface CardListProps {
  cards: CardMeta[];
  onSelect: (id: string) => void;
  selectedId?: string;
}

const categoryColors: Record<string, string> = {
  角色: '#4a90d9',
  事件: '#e8a838',
  装备: '#6bb86b',
  状态: '#b87bb8',
};

function getCategoryStyle(category: string): React.CSSProperties {
  const bg = categoryColors[category] ?? '#888';
  return { backgroundColor: bg };
}

export const CardList: React.FC<CardListProps> = ({ cards, onSelect, selectedId }) => {
  if (cards.length === 0) {
    return (
      <div className="card-list card-list--empty">
        <p className="card-list__empty-text">暂无卡牌，请创建新卡</p>
      </div>
    );
  }

  return (
    <div className="card-list">
      {cards.map(card => {
        const isSelected = card.id === selectedId;
        return (
          <div
            key={card.id}
            className={`card-list__item${isSelected ? ' card-list__item--selected' : ''}`}
            onClick={() => onSelect(card.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(card.id); }}
          >
            <div className="card-list__item-header">
              <span className="card-list__item-name">{card.name}</span>
              <span
                className="card-list__item-category"
                style={getCategoryStyle(card.category)}
              >
                {card.category}
              </span>
            </div>
            <span className="card-list__item-version">v{card.version}</span>
          </div>
        );
      })}
    </div>
  );
};
