import { EffectType, type IAtomicEffect } from "@/atomic";

export const copyCardEffect: IAtomicEffect = {
  id: "effect_copy_card",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.COPY_CARD,
  name: "复制卡牌",
  description: "复制指定数量的卡牌到手牌中",
  params: [
    {
      key: "count",
      label: "复制数",
      type: "number",
      min: 1,
      max: 5,
      default: 1,
      required: true
    }
  ]
};
