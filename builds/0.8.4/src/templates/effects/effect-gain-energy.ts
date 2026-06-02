import { EffectType, type IAtomicEffect } from "@/atomic";

export const gainEnergyEffect: IAtomicEffect = {
  id: "effect_gain_energy",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.GAIN_ENERGY,
  name: "获得技力",
  description: "使目标获得指定数值的技力",
  params: [
    {
      key: "value",
      label: "技力量",
      type: "number",
      min: 1,
      max: 99,
      default: 1,
      required: true
    }
  ]
};
