import { EffectType, type IAtomicEffect } from "@/atomic";

export const modifyAttributeEffect: IAtomicEffect = {
  id: "effect_modify_attribute",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.MODIFY_ATTRIBUTE,
  name: "修改属性",
  description: "修改目标的属性值",
  params: [
    {
      key: "attribute",
      label: "属性",
      type: "attribute",
      default: "",
      required: true
    },
    {
      key: "value",
      label: "修改值",
      type: "number",
      min: -999,
      max: 999,
      default: 0,
      required: true
    },
    {
      key: "isPermanent",
      label: "永久",
      type: "boolean",
      default: false,
      required: false
    }
  ]
};
