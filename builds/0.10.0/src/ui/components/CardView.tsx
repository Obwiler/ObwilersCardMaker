import React from 'react';
import type { CardBundle } from '../../ports/CardRepositoryPort';

interface CardViewProps {
  card: CardBundle | null;
  onEdit: () => void;
  onDelete: () => void;
}

export const CardView: React.FC<CardViewProps> = ({ card, onEdit, onDelete }) => {
  if (!card) {
    return (
      <div className="card-view card-view--empty">
        <p className="card-view__empty-text">请从列表中选择一张卡牌</p>
      </div>
    );
  }

  const { meta, source } = card;

  return (
    <div className="card-view">
      <div className="card-view__header">
        <h3 className="card-view__name">{meta.name}</h3>
        <span className="card-view__category">{meta.category}</span>
        <span className="card-view__version">v{meta.version}</span>
      </div>

      {meta.attributes && Object.keys(meta.attributes).length > 0 && (
        <div className="card-view__attributes">
          {Object.entries(meta.attributes).map(([key, value]) => (
            <div key={key} className="card-view__attribute">
              <span className="card-view__attr-key">{key}</span>
              <span className="card-view__attr-value">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card-view__source-section">
        <h4 className="card-view__section-title">源码</h4>
        <pre className="card-view__source">{source || '（无源代码）'}</pre>
      </div>

      <div className="card-view__preview-section">
        <h4 className="card-view__section-title">预览缩略</h4>
        <div className="card-view__preview-thumb">
          <div className="card-view__thumb-name">{meta.name}</div>
          <div className="card-view__thumb-category">{meta.category}</div>
        </div>
      </div>

      <div className="card-view__actions">
        <button className="card-view__edit-btn" onClick={onEdit}>
          编辑
        </button>
        <button className="card-view__delete-btn" onClick={onDelete}>
          删除
        </button>
      </div>
    </div>
  );
};
