import { EffectType, type IAtomicEffect } from "@/atomic";

export const loseEnergyEffect: IAtomicEffect = {
  id: "effect_lose_energy",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.LOSE_ENERGY,
  name: "削减技力",
  description: "削减目标指定数值的技力",
  params: [
    {
      key: "value",
      label: "削减量",
      type: "number",
      min: 1,
      max: 99,
      default: 1,
      required: true
    }
  ]
};
