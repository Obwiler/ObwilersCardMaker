import React from 'react';
import type { CardBundle } from '../../ports/CardRepositoryPort';

interface PreviewCanvasProps {
  card?: CardBundle;
  scale?: number;
}

const categoryColors: Record<string, string> = {
  角色: '#4a90d9',
  事件: '#e8a838',
  装备: '#6bb86b',
  状态: '#b87bb8',
};

function getCategoryBadge(category: string): string {
  return categoryColors[category] ?? '#888';
}

function formatAttributes(attrs: Record<string, unknown>): [string, unknown][] {
  return Object.entries(attrs).filter(([, v]) => v !== undefined && v !== null);
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({ card, scale = 1 }) => {
  if (!card) {
    return (
      <div
        className="preview-canvas preview-canvas--empty"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <span className="preview-canvas__placeholder">暂未选中卡牌</span>
      </div>
    );
  }

  const { meta, source, ast } = card;
  const badgeColor = getCategoryBadge(meta.category);
  const attributes = formatAttributes(meta.attributes);

  return (
    <div
      className="preview-canvas"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <div className="preview-canvas__header">
        <h3 className="preview-canvas__name">{meta.name}</h3>
        <span
          className="preview-canvas__category"
          style={{ backgroundColor: badgeColor }}
        >
          {meta.category}
        </span>
        <span className="preview-canvas__version">v{meta.version}</span>
      </div>

      {attributes.length > 0 && (
        <div className="preview-canvas__attributes">
          {attributes.map(([key, value]) => (
            <div key={key} className="preview-canvas__attribute">
              <span className="preview-canvas__attr-key">{key}</span>
              <span className="preview-canvas__attr-value">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {source && (
        <pre className="preview-canvas__source">{source}</pre>
      )}

      {ast ? (
        <div className="preview-canvas__ast">
          <details>
            <summary>AST</summary>
            <pre>{JSON.stringify(ast, null, 2) ?? ''}</pre>
          </details>
        </div>
      ) : null}
    </div>
  );
};
