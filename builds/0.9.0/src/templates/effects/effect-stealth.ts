import { EffectType, type IAtomicEffect } from "@/atomic";

export const stealthEffect: IAtomicEffect = {
  id: "effect_stealth",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.STEALTH,
  name: "隐匿",
  description: "使目标获得隐匿指定回合",
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
