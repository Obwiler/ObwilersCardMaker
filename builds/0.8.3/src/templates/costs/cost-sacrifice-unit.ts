import { CostType, type IAtomicCost } from "@/atomic";

export const sacrificeUnitCost: IAtomicCost = {
  id: "cost_sacrifice_unit",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: CostType.SACRIFICE_UNIT,
  name: "献祭单位",
  description: "献祭一个单位作为消耗",
  params: [
    {
      key: "target",
      label: "献祭对象",
      type: "select",
      options: [
        { label: "自己", value: "self" },
        { label: "友方", value: "ally" },
        { label: "任意友方", value: "any_ally" }
      ],
      default: "self",
      required: true
    }
  ]
};
