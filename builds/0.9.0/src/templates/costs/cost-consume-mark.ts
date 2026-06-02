import { CostType, type IAtomicCost } from "@/atomic";

export const consumeMarkCost: IAtomicCost = {
  id: "cost_consume_mark",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: CostType.CONSUME_MARK,
  name: "消耗标记",
  description: "消耗指定层数的标记作为消耗",
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
