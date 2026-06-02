import { CostType, type IAtomicCost } from "@/atomic";

export const discardCardCost: IAtomicCost = {
  id: "cost_discard_card",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: CostType.DISCARD_CARD,
  name: "弃置手牌",
  description: "弃置指定数量的手牌作为消耗",
  params: [
    {
      key: "count",
      label: "弃牌数",
      type: "number",
      min: 1,
      max: 10,
      default: 1,
      required: true
    },
    {
      key: "type",
      label: "弃牌方式",
      type: "select",
      options: [
        { label: "随机", value: "random" },
        { label: "自选", value: "manual" }
      ],
      default: "random",
      required: true
    }
  ]
};
