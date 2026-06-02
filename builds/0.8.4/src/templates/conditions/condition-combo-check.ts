import { ConditionType, type IAtomicCondition } from "@/atomic";

export const comboCheckCondition: IAtomicCondition = {
  id: "condition_combo_check",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: ConditionType.COMBO_CHECK,
  name: "连击检测",
  description: "检测本回合已使用的卡牌数量",
  params: [
    {
      key: "count",
      label: "已使用卡牌阈值",
      type: "number",
      min: 1,
      max: 99,
      default: 2,
      required: true
    }
  ]
};
