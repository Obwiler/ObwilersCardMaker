import { EffectType, type IAtomicEffect } from "@/atomic";

export const dealDamageEffect: IAtomicEffect = {
  id: "effect_deal_damage",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.DEAL_DAMAGE,
  name: "造成伤害",
  description: "对目标造成指定类型和数值的伤害",
  params: [
    {
      key: "damageType",
      label: "伤害类型",
      type: "select",
      options: [
        { label: "物理伤害", value: "physical" },
        { label: "法术伤害", value: "magical" },
        { label: "真实伤害", value: "true" }
      ],
      default: "physical",
      required: true
    },
    {
      key: "value",
      label: "伤害值",
      type: "number",
      min: 1,
      max: 999,
      default: 1,
      required: true
    }
  ]
};
