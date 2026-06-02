import { ConditionType, type IAtomicCondition } from "@/atomic";

export const equipmentCheckCondition: IAtomicCondition = {
  id: "condition_equipment_check",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: ConditionType.EQUIPMENT_CHECK,
  name: "装备检测",
  description: "检测目标是否装备了指定类型的装备",
  params: [
    {
      key: "equipmentType",
      label: "装备类型",
      type: "select",
      options: [
        { label: "兵刃", value: "weapon" },
        { label: "宝器", value: "treasure" },
        { label: "甲胄", value: "armor" }
      ],
      default: "weapon",
      required: true
    }
  ]
};
