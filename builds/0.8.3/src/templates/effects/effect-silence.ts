import { EffectType, type IAtomicEffect } from "@/atomic";

export const silenceEffect: IAtomicEffect = {
  id: "effect_silence",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.SILENCE,
  name: "沉默",
  description: "使目标沉默指定回合",
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
