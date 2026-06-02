import React, { useState, useEffect, useCallback } from 'react';
import { EditorPane } from '../components/EditorPane';
import { PreviewCanvas } from '../components/PreviewCanvas';
import { useParser } from '../hooks/useParser';
import { useCards } from '../hooks/useCards';
import type { CardBundle } from '../../ports/CardRepositoryPort';

export const EditorPage: React.FC = () => {
  const { parse, validate, issues, parseError } = useParser();
  const { load, save } = useCards();

  const [cardId, setCardId] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const [cardBundle, setCardBundle] = useState<CardBundle | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [, setHighlightedLine] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get('cardId');
    if (idFromUrl) {
      setCardId(idFromUrl);
      loadCard(idFromUrl);
    }
  }, []);

  const loadCard = async (id: string) => {
    const bundle = await load(id);
    if (bundle) {
      setCardBundle(bundle);
      setSource(bundle.source);
    }
  };

  const handleSourceChange = useCallback((value: string) => {
    setSource(value);
    setIsDirty(true);
    parse(value).then(() => {
      validate(value);
    });
  }, [parse, validate]);

  const handleSave = useCallback(async () => {
    if (!cardId || !cardBundle) return;
    await save(cardId, source, cardBundle.meta);
    setIsDirty(false);
  }, [cardId, cardBundle, source, save]);

  const validationIssues = [
    ...(parseError ? [{
      key: 'parse-error',
      line: parseError.line,
      message: parseError.message,
      severity: parseError.severity as 'error' | 'warning',
    }] : []),
    ...issues.map((issue, i) => ({
      key: `issue-${i}`,
      line: 0,
      message: issue.message,
      severity: issue.severity as 'error' | 'warning',
    })),
  ];

  return (
    <div className="page-editor">
      <div className="page-editor__header">
        <h2 className="page-editor__title">
          {cardId ? `编辑: ${cardBundle?.meta.name ?? cardId}` : 'DZ 编辑器'}
        </h2>
        <div className="page-editor__header-actions">
          <button
            className="page-editor__save-btn"
            onClick={handleSave}
            disabled={!isDirty || !cardId}
          >
            保存{isDirty ? ' ●' : ''}
          </button>
        </div>
      </div>
      <div className="page-editor__body">
        <div className="page-editor__editor-panel">
          <EditorPane
            value={source}
            onChange={handleSourceChange}
            height="100%"
          />
          {validationIssues.length > 0 && (
            <div className="page-editor__issues">
              <h4 className="page-editor__issues-title">
                问题 ({validationIssues.length})
              </h4>
              <ul className="page-editor__issues-list">
                {validationIssues.map(item => (
                  <li
                    key={item.key}
                    className={`page-editor__issue page-editor__issue--${item.severity}`}
                    onClick={() => {
                      if (item.line > 0) {
                        setHighlightedLine(item.line);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ' ') && item.line > 0) {
                        setHighlightedLine(item.line);
                      }
                    }}
                  >
                    <span className="page-editor__issue-severity">
                      {item.severity === 'error' ? '!' : '△'}
                    </span>
                    {item.line > 0 && (
                      <span className="page-editor__issue-line">L{item.line}</span>
                    )}
                    <span className="page-editor__issue-message">{item.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="page-editor__preview-panel">
          <PreviewCanvas card={cardBundle ?? undefined} scale={1} />
        </div>
      </div>
    </div>
  );
};
