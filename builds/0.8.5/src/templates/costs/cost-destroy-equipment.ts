import { CostType, type IAtomicCost } from "@/atomic";

export const destroyEquipmentCost: IAtomicCost = {
  id: "cost_destroy_equipment",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: CostType.DESTROY_EQUIPMENT,
  name: "销毁装备",
  description: "销毁指定类型的装备作为消耗",
  params: [
    {
      key: "equipmentType",
      label: "装备类型",
      type: "select",
      options: [
        { label: "兵刃", value: "weapon" },
        { label: "宝器", value: "treasure" },
        { label: "甲胄", value: "armor" },
        { label: "任意", value: "any" }
      ],
      default: "weapon",
      required: true
    }
  ]
};
