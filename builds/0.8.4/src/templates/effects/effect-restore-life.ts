import { EffectType, type IAtomicEffect } from "@/atomic";

export const restoreLifeEffect: IAtomicEffect = {
  id: "effect_restore_life",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.RESTORE_LIFE,
  name: "恢复生命",
  description: "恢复目标指定数值的生命",
  params: [
    {
      key: "value",
      label: "恢复量",
      type: "number",
      min: 1,
      max: 999,
      default: 1,
      required: true
    }
  ]
};
