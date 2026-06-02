import { ConditionType, type IAtomicCondition } from "@/atomic";

export const distanceCheckCondition: IAtomicCondition = {
  id: "condition_distance_check",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: ConditionType.DISTANCE_CHECK,
  name: "距离检测",
  description: "检测目标与来源的距离",
  params: [
    {
      key: "operator",
      label: "比较符",
      type: "select",
      options: [
        { label: "<=", value: "<=" },
        { label: ">=", value: ">=" },
        { label: "=", value: "=" },
        { label: "!=", value: "!=" }
      ],
      default: "<=",
      required: true
    },
    {
      key: "value",
      label: "比较值",
      type: "number",
      min: 0,
      max: 99,
      default: 1,
      required: true
    }
  ]
};
