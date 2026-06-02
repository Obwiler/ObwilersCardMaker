import { EffectType, type IAtomicEffect } from "@/atomic";

export const summonEffect: IAtomicEffect = {
  id: "effect_summon",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.SUMMON,
  name: "召唤单位",
  description: "召唤一个单位到场上",
  params: [
    {
      key: "unitId",
      label: "单位ID",
      type: "string",
      default: "",
      required: true
    },
    {
      key: "position",
      label: "位置",
      type: "select",
      options: [
        { label: "随机", value: "random" },
        { label: "左侧", value: "left" },
        { label: "右侧", value: "right" }
      ],
      default: "random",
      required: true
    }
  ]
};
