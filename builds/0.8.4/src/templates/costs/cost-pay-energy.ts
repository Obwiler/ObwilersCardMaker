import { CostType, type IAtomicCost } from "@/atomic";

export const payEnergyCost: IAtomicCost = {
  id: "cost_pay_energy",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: CostType.PAY_ENERGY,
  name: "支付技力",
  description: "支付指定数值的技力作为消耗",
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
