import { EffectType, type IAtomicEffect } from "@/atomic";

export const stunEffect: IAtomicEffect = {
  id: "effect_stun",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.STUN,
  name: "眩晕",
  description: "使目标眩晕指定回合",
  params: [
    {
      key: "duration",
      label: "持续回合",
      type: "number",
      min: 1,
      max: 9,
      default: 1,
      required: true
    }
  ]
};
