import React, { useState, useEffect, useCallback } from 'react';
import { EditorPane } from '../components/EditorPane';
import { useParser } from '../hooks/useParser';
import { useCards } from '../hooks/useCards';
import type { CardBundle } from '../../ports/CardRepositoryPort';

interface Props { cardId: string | null; onClose: () => void }

export const CardEditorPage: React.FC<Props> = ({ cardId, onClose }) => {
  const { parse, validate, parseResult, issues, parseError } = useParser();
  const { load, save } = useCards();

  const [source, setSource] = useState('');
  const [cardBundle, setCardBundle] = useState<CardBundle | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (cardId) {
      load(cardId).then(b => {
        if (b) { setCardBundle(b); setSource(b.source); }
      });
    } else {
      setCardBundle(null); setSource('');
    }
  }, [cardId]);

  const handleSourceChange = useCallback((value: string) => {
    setSource(value);
    setIsDirty(true);
    parse(value).then(() => validate(value));
  }, [parse, validate]);

  const handleSave = async () => {
    if (!cardId || !cardBundle) return;
    setSaving(true); setSaveMsg('');
    try {
      await save(cardId, source, cardBundle.meta);
      setIsDirty(false); setSaveMsg('保存成功');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch { setSaveMsg('保存失败'); }
    finally { setSaving(false); }
  };

  const handleNewCard = useCallback(async () => {
    const now = Date.now();
    const newId = `CARD_${now}`;
    const newSource = `新卡 [基本牌, 白]\n  效果文本。`;
    setCardBundle({
      meta: { id: newId, name: '新卡', category: '基本牌', attributes: {}, version: '0.10.0' },
      source: newSource, ast: null,
    });
    setSource(newSource);
    setIsDirty(true);
  }, []);

  const editorErrors = [
    ...(parseError ? [{ line: parseError.line, column: parseError.column, message: parseError.message, severity: parseError.severity as 'error' | 'warning' }] : []),
    ...issues.map(i => ({ line: i.ruleId, column: 0, message: i.message, severity: i.severity })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={onClose} style={backBtn}>← 卡牌库</button>
        <span style={{ fontWeight: 600, color: '#e6edf3', fontSize: 14 }}>
          {cardId ?? '新卡牌'}
        </span>
        {cardBundle && (
          <span style={{ fontSize: 11, color: '#8b949e' }}>
            类型: {cardBundle.meta.category} | v{cardBundle.meta.version}
          </span>
        )}
        {!cardId && (
          <button onClick={handleNewCard} style={btnPrimary}>新建卡牌</button>
        )}
        <div style={{ flex: 1 }} />
        {isDirty && <span style={{ fontSize: 11, color: '#e3b341' }}>未保存</span>}
        {saveMsg && <span style={{ fontSize: 11, color: saveMsg.includes('失败') ? '#f85149' : '#7ee787' }}>{saveMsg}</span>}
        {cardId && (
          <button onClick={handleSave} disabled={saving || !isDirty} style={{
            ...btnPrimary,
            opacity: (saving || !isDirty) ? 0.5 : 1,
          }}>
            {saving ? '保存中...' : '保存'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#161b22', borderRadius: 8, border: '1px solid #30363d', overflow: 'hidden' }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid #30363d', fontSize: 11, color: '#8b949e' }}>
            DZ 源码编辑器
          </div>
          <div style={{ flex: 1 }}>
            <EditorPane
              value={source}
              onChange={handleSourceChange}
              onParseResult={() => {}}
              minimap={false}
              height="100%"
            />
          </div>
        </div>

        <aside style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', marginBottom: 8 }}>解析结果</div>
            {parseResult ? (
              <pre style={{ fontSize: 10, color: '#7ee787', margin: 0, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(parseResult, null, 2)}
              </pre>
            ) : (
              <span style={{ fontSize: 11, color: '#484f58' }}>
                {source ? '输入源码后自动解析...' : '尚未输入源码'}
              </span>
            )}
          </div>

          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 12, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', marginBottom: 8 }}>
              校验 ({editorErrors.length})
            </div>
            {editorErrors.length === 0 ? (
              <span style={{ fontSize: 11, color: '#7ee787' }}>✓ 无校验问题</span>
            ) : (
              <div style={{ fontSize: 10, maxHeight: 300, overflow: 'auto' }}>
                {editorErrors.map((e, i) => (
                  <div key={i} style={{
                    padding: '4px 6px', marginBottom: 4, borderRadius: 4,
                    background: e.severity === 'error' ? '#da363322' : '#e3b34122',
                    borderLeft: `3px solid ${e.severity === 'error' ? '#f85149' : '#e3b341'}`,
                  }}>
                    <span style={{ color: e.severity === 'error' ? '#f85149' : '#e3b341' }}>
                      {e.severity === 'error' ? '✕' : '!'}
                    </span>
                    {' '}{e.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          {cardBundle && (
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 12, minHeight: 120 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', marginBottom: 8 }}>属性</div>
              {cardBundle.meta.attributes && Object.keys(cardBundle.meta.attributes).length > 0 ? (
                Object.entries(cardBundle.meta.attributes).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 11, color: '#c9d1d9', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#8b949e' }}>{k}</span>
                    <span>{String(v)}</span>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: 11, color: '#484f58' }}>无属性</span>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

const btnPrimary: React.CSSProperties = {
  padding: '5px 12px', background: '#238636', border: '1px solid rgba(240,246,252,.1)',
  borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12,
};
const backBtn: React.CSSProperties = {
  padding: '5px 12px', background: '#21262d', border: '1px solid #30363d',
  borderRadius: 6, color: '#8b949e', cursor: 'pointer', fontSize: 12,
};
