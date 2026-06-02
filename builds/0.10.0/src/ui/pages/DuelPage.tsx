import React, { useState } from 'react';
import { useDuel } from '../hooks/useDuel';

export const DuelPage: React.FC = () => {
  const duel = useDuel();
  const { players, turn, phase, hand, field, log, drawCard, playCard, nextTurn } = duel;
  void (duel as unknown as Record<string, unknown>).initGame;
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);

  const handlePlayCard = async () => {
    if (selectedHandIndex !== null) {
      await playCard(0, selectedHandIndex);
      setSelectedHandIndex(null);
    }
  };

  const opponent = players[1];

  return (
    <div style={{ padding: 16, color: '#ccc', background: '#1a1a2e', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 'bold', marginRight: 12 }}>回合 {turn}</span>
          <span style={{ color: '#888', textTransform: 'uppercase' }}>{phase}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => drawCard(0)} style={btnStyle}>抽牌</button>
          <button onClick={() => nextTurn()} style={{ ...btnStyle, background: '#2ecc71' }}>结束回合</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 8px', color: '#888' }}>对手手牌 ({opponent?.hand.length ?? 0})</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              {opponent?.hand.map((_, i) => (
                <div key={i} style={cardBackStyle}>?</div>
              ))}
              {(!opponent || opponent.hand.length === 0) && <span style={{ color: '#555' }}>无手牌</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 8px', color: '#888' }}>对手战场</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                {opponent?.field.map(c => (
                  <div key={c.runtimeId} style={cardFieldStyle}>{c.staticDefRef}</div>
                ))}
                {(!opponent || opponent.field.length === 0) && <span style={{ color: '#555' }}>空</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: '#e74c3c', fontWeight: 'bold' }}>VS</div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 8px', color: '#888' }}>己方战场</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                {field.map(c => (
                  <div key={c.runtimeId} style={cardFieldStyle}>{c.staticDefRef}</div>
                ))}
                {field.length === 0 && <span style={{ color: '#555' }}>空</span>}
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px', color: '#888' }}>己方手牌</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {hand.map((c, i) => (
                <div
                  key={c.runtimeId}
                  onClick={() => setSelectedHandIndex(selectedHandIndex === i ? null : i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') setSelectedHandIndex(selectedHandIndex === i ? null : i); }}
                  style={{
                    ...cardHandStyle,
                    borderColor: selectedHandIndex === i ? '#e67e22' : '#444',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{c.staticDefRef}</div>
                  <div style={{ fontSize: 10, color: '#666' }}>{c.runtimeId}</div>
                </div>
              ))}
              {hand.length === 0 && <span style={{ color: '#555' }}>无手牌</span>}
            </div>
          </div>

          {selectedHandIndex !== null && (
            <div style={{ marginTop: 12 }}>
              <button onClick={handlePlayCard} style={{ ...btnStyle, background: '#e67e22' }}>打出此牌</button>
            </div>
          )}
        </div>

        <aside style={{ width: 200, borderLeft: '1px solid #333', paddingLeft: 12 }}>
          <h4 style={{ margin: '0 0 8px', color: '#888' }}>效果日志</h4>
          <div style={{ maxHeight: 400, overflowY: 'auto', fontSize: 11, color: '#666' }}>
            {log.length === 0 && <span>暂无日志</span>}
            {[...log].reverse().map((entry, i) => (
              <div key={`${entry.turn}-${i}`} style={{ padding: '2px 0', borderBottom: '1px solid #222' }}>
                <span style={{ color: '#888' }}>T{entry.turn}</span>
                {' '}{entry.action}{' '}
                {entry.actor && <span style={{ color: '#a0c0e0' }}>{entry.actor}</span>}
                {entry.target && <span style={{ color: '#e0c060' }}> → {entry.target}</span>}
                {' '}<span style={{ color: '#555' }}>{entry.result}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  padding: '6px 16px',
  background: '#3498db',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
};

const cardFieldStyle: React.CSSProperties = {
  width: 80,
  height: 100,
  background: '#2c3e50',
  borderRadius: 6,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  color: '#ddd',
  border: '2px solid #444',
};

const cardHandStyle: React.CSSProperties = {
  ...cardFieldStyle,
  cursor: 'pointer',
};

const cardBackStyle: React.CSSProperties = {
  ...cardFieldStyle,
  background: '#1a1a3e',
  cursor: 'default',
};
