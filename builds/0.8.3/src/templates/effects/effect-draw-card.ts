import { EffectType, type IAtomicEffect } from "@/atomic";

export const drawCardEffect: IAtomicEffect = {
  id: "effect_draw_card",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.DRAW_CARD,
  name: "抽牌",
  description: "从牌库抽取指定数量的卡牌",
  params: [
    {
      key: "count",
      label: "抽牌数",
      type: "number",
      min: 1,
      max: 10,
      default: 1,
      required: true
    }
  ]
};
