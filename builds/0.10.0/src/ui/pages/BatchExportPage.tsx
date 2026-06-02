import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const BatchExportPage: React.FC = () => {
  const [scale, setScale] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true); setResult(null); setError(null);
    try {
      const msg = await invoke<string>('batch_export', { set_name: `dz_export_${Date.now()}` });
      setResult(msg);
    } catch (e) {
      setError(typeof e === 'string' ? e : (e instanceof Error ? e.message : '导出失败'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>批量导出</div>
      <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 16 }}>
        将 cards/ 目录下的所有卡牌按配比表批量渲染为卡面图像，同时生成 manifest.json 索引文件。
      </p>

      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#8b949e', marginBottom: 4 }}>缩放比例</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="range"
              min={0.5} max={4} step={0.1}
              value={scale}
              onChange={e => setScale(parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ width: 40, textAlign: 'right', fontSize: 14, color: '#c9d1d9' }}>{scale}x</span>
          </div>
          <div style={{ fontSize: 10, color: '#484f58', marginTop: 4 }}>
            卡面尺寸: {Math.round(300 * scale)}×{Math.round(420 * scale)} px
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            ...btnPrimary,
            width: '100%',
            opacity: exporting ? 0.5 : 1,
            fontSize: 14, padding: '10px 0',
          }}
        >
          {exporting ? '⏳ 渲染中...' : `导出全部卡牌 (${scale}x)`}
        </button>
      </div>

      {result && (
        <div style={{
          background: '#161b22', border: '1px solid #238636', borderRadius: 8,
          padding: 16, color: '#7ee787', fontSize: 13,
        }}>
          ✓ {result}
        </div>
      )}

      {error && (
        <div style={{
          background: '#161b22', border: '1px solid #f85149', borderRadius: 8,
          padding: 16, color: '#f85149', fontSize: 13,
        }}>
          ✕ {error}
        </div>
      )}

      <div style={{ marginTop: 24, background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#c9d1d9' }}>说明</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#8b949e', fontSize: 12, lineHeight: 1.8 }}>
          <li>所有卡牌从 cards/ 目录读取 card.dz 源文件</li>
          <li>依据 _distribution.json 配比表确定每张卡的数量</li>
          <li>通过 Rust 端 CanvasRenderer 7层合成渲染为 SVG</li>
          <li>输出至 builds/0.10.0/output/ 目录</li>
          <li>同步生成 manifest.json 索引文件</li>
        </ul>
      </div>
    </div>
  );
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', background: '#238636', border: '1px solid rgba(240,246,252,.1)',
  borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 13,
};
