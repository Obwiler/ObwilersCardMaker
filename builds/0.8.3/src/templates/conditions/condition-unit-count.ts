import { ConditionType, type IAtomicCondition } from "@/atomic";

export const unitCountCondition: IAtomicCondition = {
  id: "condition_unit_count",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: ConditionType.UNIT_COUNT,
  name: "单位数量",
  description: "检测场上单位数量",
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
      key: "count",
      label: "比较值",
      type: "number",
      min: 0,
      max: 99,
      default: 0,
      required: true
    }
  ]
};
