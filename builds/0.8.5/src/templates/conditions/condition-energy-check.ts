import { ConditionType, type IAtomicCondition } from "@/atomic";

export const energyCheckCondition: IAtomicCondition = {
  id: "condition_energy_check",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: ConditionType.ENERGY_CHECK,
  name: "技力检测",
  description: "检测目标的技力值",
  params: [
    {
      key: "operator",
      label: "比较符",
      type: "select",
      options: [
        { label: ">=", value: ">=" },
        { label: "<=", value: "<=" },
        { label: "=", value: "=" },
        { label: "!=", value: "!=" }
      ],
      default: ">=",
      required: true
    },
    {
      key: "value",
      label: "比较值",
      type: "number",
      min: 0,
      max: 99,
      default: 0,
      required: true
    }
  ]
};
