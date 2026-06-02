import { EffectType, type IAtomicEffect } from "@/atomic";

export const switchPositionEffect: IAtomicEffect = {
  id: "effect_switch_position",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.SWITCH_POSITION,
  name: "交换位置",
  description: "与目标单位交换位置",
  params: []
};
