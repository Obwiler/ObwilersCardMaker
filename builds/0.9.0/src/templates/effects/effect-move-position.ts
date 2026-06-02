import { EffectType, type IAtomicEffect } from "@/atomic";

export const movePositionEffect: IAtomicEffect = {
  id: "effect_move_position",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.MOVE_POSITION,
  name: "移动位置",
  description: "将目标向指定方向移动指定步数",
  params: [
    {
      key: "direction",
      label: "方向",
      type: "select",
      options: [
        { label: "左移", value: "left" },
        { label: "右移", value: "right" },
        { label: "任意", value: "any" }
      ],
      default: "left",
      required: true
    },
    {
      key: "steps",
      label: "步数",
      type: "number",
      min: 1,
      max: 9,
      default: 1,
      required: true
    }
  ]
};
