import { EffectType, type IAtomicEffect } from "@/atomic";

export const transformEffect: IAtomicEffect = {
  id: "effect_transform",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.TRANSFORM,
  name: "变形",
  description: "将目标卡牌变形为指定卡牌",
  params: [
    {
      key: "targetCardId",
      label: "目标卡牌ID",
      type: "string",
      default: "",
      required: true
    }
  ]
};
