import { EffectType, type IAtomicEffect } from "@/atomic";

export const addMarkEffect: IAtomicEffect = {
  id: "effect_add_mark",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.ADD_MARK,
  name: "添加标记",
  description: "为目标添加指定层数的标记",
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
