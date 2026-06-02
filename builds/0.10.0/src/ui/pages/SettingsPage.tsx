import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

const LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
];

type ThemeMode = 'light' | 'dark';

export const SettingsPage: React.FC = () => {
  const [language, setLanguage] = useState('zh-CN');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<string | null>(null);
  const [defaultScale, setDefaultScale] = useState(1);
  const [outputDir, setOutputDir] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const lang = await invoke<string>('config_get', { key: 'language' });
      setLanguage(lang || 'zh-CN');
      const t = await invoke<string>('config_get', { key: 'theme' });
      setTheme((t as ThemeMode) || 'light');
      const key = await invoke<string>('config_get', { key: 'ai_api_key' });
      setApiKey(key || '');
      const m = await invoke<string>('config_get', { key: 'ai_model' });
      setModel(m || 'gpt-4o-mini');
      const scale = await invoke<number>('config_get', { key: 'export_scale' });
      setDefaultScale(scale || 1);
      const dir = await invoke<string>('config_get', { key: 'export_output_dir' });
      setOutputDir(dir || '');
    } catch {
    }
  };

  const saveConfig = async (key: string, value: unknown) => {
    try {
      await invoke('config_set', { key, value });
    } catch {
    }
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    saveConfig('language', value);
  };

  const handleThemeToggle = () => {
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    saveConfig('theme', next);
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    saveConfig('ai_api_key', value);
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    saveConfig('ai_model', value);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const result = await invoke<string>('ai_assistant_test_connection', { apiKey, model });
      setConnectionResult(result);
    } catch (e) {
      setConnectionResult(e instanceof Error ? e.message : '连接失败');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleScaleChange = (value: number) => {
    setDefaultScale(value);
  };

  const handleOutputDirChange = (value: string) => {
    setOutputDir(value);
  };

  const handleExportSave = () => {
    saveConfig('export_scale', defaultScale);
    saveConfig('export_output_dir', outputDir);
  };

  const handleBackup = async () => {
    try {
      await invoke('config_backup');
    } catch {
    }
  };

  const handleRestore = async () => {
    try {
      await invoke('config_restore');
      await loadSettings();
    } catch {
    }
  };

  const handleResetDefaults = async () => {
    try {
      await invoke('config_reset_defaults');
      await loadSettings();
    } finally {
      setShowResetConfirm(false);
    }
  };

  return (
    <div className="page-settings">
      <h2 className="page-settings__title">设置</h2>

      <section className="page-settings__section">
        <h3 className="page-settings__section-title">通用</h3>
        <div className="page-settings__field">
          <label className="page-settings__label">语言 / Language</label>
          <select
            className="page-settings__select"
            value={language}
            onChange={e => handleLanguageChange(e.target.value)}
          >
            {LANGUAGE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="page-settings__field">
          <label className="page-settings__label">主题</label>
          <div className="page-settings__toggle">
            <button
              className={`page-settings__toggle-btn${theme === 'light' ? ' page-settings__toggle-btn--active' : ''}`}
              onClick={() => theme !== 'light' && handleThemeToggle()}
            >
              浅色
            </button>
            <button
              className={`page-settings__toggle-btn${theme === 'dark' ? ' page-settings__toggle-btn--active' : ''}`}
              onClick={() => theme !== 'dark' && handleThemeToggle()}
            >
              深色
            </button>
          </div>
        </div>
      </section>

      <section className="page-settings__section">
        <h3 className="page-settings__section-title">AI</h3>
        <div className="page-settings__field">
          <label className="page-settings__label">API Key</label>
          <input
            type="password"
            className="page-settings__input"
            value={apiKey}
            onChange={e => handleApiKeyChange(e.target.value)}
            placeholder="sk-..."
          />
        </div>
        <div className="page-settings__field">
          <label className="page-settings__label">模型</label>
          <select
            className="page-settings__select"
            value={model}
            onChange={e => handleModelChange(e.target.value)}
          >
            {MODEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="page-settings__field">
          <button
            className="page-settings__btn page-settings__btn--primary"
            onClick={handleTestConnection}
            disabled={testingConnection || !apiKey}
          >
            {testingConnection ? '测试中...' : '测试连接'}
          </button>
          {connectionResult && (
            <span className={`page-settings__result ${connectionResult.includes('成功') ? 'page-settings__result--ok' : 'page-settings__result--fail'}`}>
              {connectionResult}
            </span>
          )}
        </div>
      </section>

      <section className="page-settings__section">
        <h3 className="page-settings__section-title">导出</h3>
        <div className="page-settings__field">
          <label className="page-settings__label">默认缩放比例</label>
          <input
            type="number"
            className="page-settings__input page-settings__input--short"
            value={defaultScale}
            min={0.1}
            max={4}
            step={0.1}
            onChange={e => handleScaleChange(parseFloat(e.target.value) || 1)}
          />
        </div>
        <div className="page-settings__field">
          <label className="page-settings__label">默认输出目录</label>
          <div className="page-settings__dir-row">
            <input
              type="text"
              className="page-settings__input page-settings__input--wide"
              value={outputDir}
              onChange={e => handleOutputDirChange(e.target.value)}
              placeholder="例如: ./output"
            />
          </div>
        </div>
        <div className="page-settings__field">
          <button className="page-settings__btn page-settings__btn--primary" onClick={handleExportSave}>
            保存导出设置
          </button>
        </div>
      </section>

      <section className="page-settings__section">
        <h3 className="page-settings__section-title">数据</h3>
        <div className="page-settings__field">
          <button className="page-settings__btn" onClick={handleBackup}>
            备份配置
          </button>
        </div>
        <div className="page-settings__field">
          <button className="page-settings__btn" onClick={handleRestore}>
            恢复配置
          </button>
        </div>
        <div className="page-settings__field">
          <button
            className="page-settings__btn page-settings__btn--danger"
            onClick={() => setShowResetConfirm(true)}
          >
            恢复出厂设置
          </button>
        </div>
      </section>

      {showResetConfirm && (
        <div className="page-settings__overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="page-settings__dialog" onClick={e => e.stopPropagation()}>
            <p className="page-settings__dialog-text">确认恢复出厂设置？所有配置将被重置为默认值。</p>
            <div className="page-settings__dialog-actions">
              <button
                className="page-settings__dialog-btn page-settings__dialog-btn--cancel"
                onClick={() => setShowResetConfirm(false)}
              >
                取消
              </button>
              <button
                className="page-settings__dialog-btn page-settings__dialog-btn--confirm"
                onClick={handleResetDefaults}
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
