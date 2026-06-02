import { CostType, type IAtomicCost } from "@/atomic";

export const skipDrawCost: IAtomicCost = {
  id: "cost_skip_draw",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: CostType.SKIP_DRAW,
  name: "跳过抽牌",
  description: "跳过指定回合的抽牌作为消耗",
  params: [
    {
      key: "turns",
      label: "跳过回合数",
      type: "number",
      min: 1,
      max: 9,
      default: 1,
      required: true
    }
  ]
};
