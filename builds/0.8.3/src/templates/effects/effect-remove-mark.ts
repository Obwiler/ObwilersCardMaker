import { EffectType, type IAtomicEffect } from "@/atomic";

export const removeMarkEffect: IAtomicEffect = {
  id: "effect_remove_mark",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.REMOVE_MARK,
  name: "移除标记",
  description: "从目标移除指定层数的标记",
  params: [
    {
      key: "markId",
      label: "标记",
      type: "mark",
      default: "",
      required: true
    },
    {
      key: "stack",
      label: "层数",
      type: "number",
      min: 1,
      max: 99,
      default: 1,
      required: true
    }
  ]
};
