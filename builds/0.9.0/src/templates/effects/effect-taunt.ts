import { EffectType, type IAtomicEffect } from "@/atomic";

export const tauntEffect: IAtomicEffect = {
  id: "effect_taunt",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.TAUNT,
  name: "嘲讽",
  description: "使目标获得嘲讽指定回合",
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
