// ============================================================
// CardMaker — 本地设置管理器（全 localStorage, 0.9.0）
// ============================================================

import type { IAppSettings } from '@/atomic';
import { DEFAULT_APP_SETTINGS } from '@/atomic';

const STORAGE_KEY = 'cardmaker_settings';

class ConfigManager {
  private settings: IAppSettings;

  constructor() {
    this.settings = this.loadFromStorage() ?? this.cloneDefaults();
  }

  /* ---------- 内部工具 ---------- */

  private cloneDefaults(): IAppSettings {
    return JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
  }

  private loadFromStorage(): IAppSettings | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // 验证所有必要的分区存在
      const requiredSections = ['outputPaths', 'cardVisuals', 'gameConstants', 'editorPreferences'];
      for (const section of requiredSections) {
        if (!(section in parsed)) return null;
      }
      return parsed as IAppSettings;
    } catch {
      return null;
    }
  }

  /* ---------- 公开接口 ---------- */

  /** 将所有设置写入 localStorage */
  save(): void {
    this.settings.lastModified = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
  }

  /** 返回完整 IAppSettings 对象（只读副本） */
  getAll(): IAppSettings {
    return JSON.parse(JSON.stringify(this.settings));
  }

  /** 导出为 JSON 字符串 */
  exportToJSON(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /** 从 JSON 字符串导入并合并设置（浅合并 + 保存） */
  importFromJSON(json: string): { success: boolean; error?: string } {
    try {
      const incoming = JSON.parse(json) as Partial<IAppSettings>;
      const sections = Object.keys(DEFAULT_APP_SETTINGS) as (keyof IAppSettings)[];
      for (const section of sections) {
        if (section === 'version' || section === 'lastModified') continue;
        if (incoming[section] && typeof incoming[section] === 'object') {
          const merged = {
            ...(this.settings[section] as object),
            ...(incoming[section] as object),
          };
          (this.settings as unknown as Record<string, unknown>)[section] = merged;
        }
      }
      this.save();
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  /** 恢复默认设置并保存 */
  reset(): void {
    this.settings = this.cloneDefaults();
    this.save();
  }

  /** 读取特定设置项 */
  get<K extends keyof IAppSettings>(section: K, key: string): unknown {
    const s = this.settings[section] as unknown as Record<string, unknown>;
    return s[key];
  }

  /** 设置特定项（不自动保存，需调用 save()） */
  set<K extends keyof IAppSettings>(section: K, key: string, value: unknown): void {
    const s = this.settings[section] as unknown as Record<string, unknown>;
    s[key] = value;
  }
}

/** 全局单例 */
export const configManager = new ConfigManager();
export { ConfigManager };
