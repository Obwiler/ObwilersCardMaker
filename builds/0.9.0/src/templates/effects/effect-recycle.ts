import { EffectType, type IAtomicEffect } from "@/atomic";

export const recycleEffect: IAtomicEffect = {
  id: "effect_recycle",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.RECYCLE,
  name: "回收",
  description: "从弃牌堆回收指定数量的卡牌到手牌或牌库",
  params: [
    {
      key: "count",
      label: "回收数",
      type: "number",
      min: 1,
      max: 5,
      default: 1,
      required: true
    }
  ]
};
