import { EffectType, type IAtomicEffect } from "@/atomic";

export const destroyEffect: IAtomicEffect = {
  id: "effect_destroy",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.DESTROY,
  name: "消灭单位",
  description: "消灭目标单位",
  params: []
};
