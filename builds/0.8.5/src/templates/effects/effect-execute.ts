import { EffectType, type IAtomicEffect } from "@/atomic";

export const executeEffect: IAtomicEffect = {
  id: "effect_execute",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.EXECUTE,
  name: "淘汰",
  description: "直接消灭目标，跳过濒死阶段",
  params: [
    {
      key: "skipNearDeath",
      label: "跳过濒死",
      type: "boolean",
      default: true,
      required: false
    }
  ]
};