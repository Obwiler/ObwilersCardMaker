import { EffectType, type IAtomicEffect } from "@/atomic";

export const gainArmorEffect: IAtomicEffect = {
  id: "effect_gain_armor",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.GAIN_ARMOR,
  name: "获得护甲",
  description: "使目标获得指定数值的护甲",
  params: [
    {
      key: "value",
      label: "护甲量",
      type: "number",
      min: 1,
      max: 999,
      default: 1,
      required: true
    }
  ]
};
