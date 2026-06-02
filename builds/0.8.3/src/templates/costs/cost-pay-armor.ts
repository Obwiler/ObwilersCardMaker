import { CostType, type IAtomicCost } from "@/atomic";

export const payArmorCost: IAtomicCost = {
  id: "cost_pay_armor",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: CostType.PAY_ARMOR,
  name: "支付护甲",
  description: "支付指定数值的护甲作为消耗",
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
