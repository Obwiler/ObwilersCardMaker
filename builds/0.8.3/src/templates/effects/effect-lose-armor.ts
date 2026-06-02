import { EffectType, type IAtomicEffect } from "@/atomic";

export const loseArmorEffect: IAtomicEffect = {
  id: "effect_lose_armor",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.LOSE_ARMOR,
  name: "削减护甲",
  description: "削减目标指定数值的护甲",
  params: [
    {
      key: "value",
      label: "削减量",
      type: "number",
      min: 1,
      max: 999,
      default: 1,
      required: true
    }
  ]
};
