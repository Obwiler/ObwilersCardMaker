import { ConditionType, type IAtomicCondition } from "@/atomic";

export const turnCheckCondition: IAtomicCondition = {
  id: "condition_turn_check",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: ConditionType.TURN_CHECK,
  name: "回合检定",
  description: "检查当前回合数",
  params: [
    {
      key: "turnType",
      label: "回合类型",
      type: "select",
      options: [
        { label: "小回合", value: "small" },
        { label: "大回合", value: "big" }
      ],
      default: "small",
      required: true
    },
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
      min: 1,
      max: 99,
      default: 1,
      required: true
    }
  ]
};
