import type { IMarkDefinition } from "@/atomic";
import { MarkType, StackingType, MarkExpireBehavior } from "@/atomic";

class MarkManager {
  private marks: Map<string, IMarkDefinition>;

  constructor() {
    this.marks = new Map();
    this.initPresets();
  }

  private initPresets(): void {
    const now = Date.now();

    const presets: IMarkDefinition[] = [
      {
        id: "mark_renxin", version: "1.0", createdAt: now, updatedAt: now,
        name: "仁心", displayName: "仁心", description: "儒家核心标记，提升生命恢复效果",
        icon: "", type: MarkType.POSITIVE, maxStack: 99, duration: 0,
        stackingType: StackingType.ADD_VALUE, expireBehavior: MarkExpireBehavior.REMOVE_ALL
      },
      {
        id: "mark_fengbao", version: "1.0", createdAt: now, updatedAt: now,
        name: "锋爆", displayName: "锋爆", description: "兵家核心标记，提升攻击伤害",
        icon: "", type: MarkType.POSITIVE, maxStack: 99, duration: 0,
        stackingType: StackingType.ADD_VALUE, expireBehavior: MarkExpireBehavior.REMOVE_ALL
      },
      {
        id: "mark_jianyi", version: "1.0", createdAt: now, updatedAt: now,
        name: "坚毅", displayName: "坚毅", description: "增加护甲",
        icon: "", type: MarkType.POSITIVE, maxStack: 10, duration: 3,
        stackingType: StackingType.ADD_COUNT, expireBehavior: MarkExpireBehavior.REMOVE_ONE
      },
      {
        id: "mark_xuruo", version: "1.0", createdAt: now, updatedAt: now,
        name: "虚弱", displayName: "虚弱", description: "减少攻击",
        icon: "", type: MarkType.NEGATIVE, maxStack: 5, duration: 2,
        stackingType: StackingType.ADD_COUNT, expireBehavior: MarkExpireBehavior.REMOVE_ONE
      }
    ];

    for (const p of presets) {
      this.marks.set(p.id, p);
    }
  }

  getAllMarks(): IMarkDefinition[] {
    return Array.from(this.marks.values());
  }

  getMarkById(id: string): IMarkDefinition | undefined {
    return this.marks.get(id);
  }

  addCustomMark(mark: IMarkDefinition): void {
    if (this.marks.has(mark.id)) {
      throw new Error(`标记 ID "${mark.id}" 已存在`);
    }
    this.marks.set(mark.id, { ...mark });
  }

  updateCustomMark(mark: IMarkDefinition): boolean {
    if (!this.marks.has(mark.id)) return false;
    this.marks.set(mark.id, { ...mark, updatedAt: Date.now() });
    return true;
  }

  deleteCustomMark(id: string): boolean {
    return this.marks.delete(id);
  }

  exportCustomMarks(): string {
    const presetIds = ["mark_renxin", "mark_fengbao", "mark_jianyi", "mark_xuruo"];
    const customs = Array.from(this.marks.values()).filter(
      (m) => !presetIds.includes(m.id)
    );
    return JSON.stringify(customs, null, 2);
  }

  importCustomMarks(json: string): void {
    try {
      const marks: IMarkDefinition[] = JSON.parse(json);
      for (const mark of marks) {
        if (!this.marks.has(mark.id)) {
          this.marks.set(mark.id, mark);
        }
      }
    } catch {
      throw new Error("导入标记失败：JSON 格式无效");
    }
  }
}

const markManager = new MarkManager();

export { MarkManager, markManager };
