import { CostType, type IAtomicCost } from "@/atomic";

export const payLifeCost: IAtomicCost = {
  id: "cost_pay_life",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: CostType.PAY_LIFE,
  name: "支付生命",
  description: "支付指定数值的生命作为消耗",
  params: [
    {
      key: "value",
      label: "支付量",
      type: "number",
      min: 1,
      max: 99,
      default: 1,
      required: true
    }
  ]
};
