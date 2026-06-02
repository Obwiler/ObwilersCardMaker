import { EffectType, type IAtomicEffect } from "@/atomic";

export const discoverEffect: IAtomicEffect = {
  id: "effect_discover",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.DISCOVER,
  name: "发现",
  description: "从卡池中发现指定数量的选项供选择",
  params: [
    {
      key: "count",
      label: "选项数",
      type: "number",
      min: 2,
      max: 5,
      default: 3,
      required: true
    },
    {
      key: "cardPool",
      label: "卡池",
      type: "select",
      options: [
        { label: "随机", value: "random" },
        { label: "构筑", value: "deck" },
        { label: "共享", value: "shared" }
      ],
      default: "random",
      required: true
    }
  ]
};
