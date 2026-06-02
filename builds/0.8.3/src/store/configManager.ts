import { DEFAULT_CONFIG, type AttributeType } from "@/atomic";

class ConfigManager {
  private configs: Record<string, unknown>;

  constructor() {
    this.configs = { ...DEFAULT_CONFIG as unknown as Record<string, unknown> };
  }

  get(key: string): unknown {
    return this.configs[key];
  }

  getAttributeMax(attribute: AttributeType): number {
    const maxValues = this.configs["maxAttributeValues"] as Record<string, number> | undefined;
    if (!maxValues) return 999;
    return maxValues[attribute] ?? 999;
  }

  getMaxDeckSize(): number {
    return (this.configs["max_deck_size"] as number) ?? 30;
  }

  getCooldownRange(): { min: number; max: number } {
    return {
      min: (this.configs["min_cooldown"] as number) ?? 0,
      max: (this.configs["max_cooldown"] as number) ?? 99
    };
  }

  set(key: string, value: unknown): void {
    this.configs[key] = value;
  }

  getAll(): Record<string, unknown> {
    return { ...this.configs };
  }

  reset(): void {
    this.configs = { ...DEFAULT_CONFIG as unknown as Record<string, unknown> };
  }

  exportConfigs(): string {
    return JSON.stringify(this.configs, null, 2);
  }

  importConfigs(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("配置数据格式无效");
      }
      this.configs = { ...parsed };
    } catch (e) {
      throw new Error(`导入配置失败：${e instanceof Error ? e.message : "JSON 格式无效"}`);
    }
  }
}

const configManager = new ConfigManager();

export { ConfigManager, configManager };
