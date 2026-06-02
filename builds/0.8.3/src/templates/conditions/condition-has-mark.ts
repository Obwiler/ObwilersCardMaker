import { ConditionType, type IAtomicCondition } from "@/atomic";

export const hasMarkCondition: IAtomicCondition = {
  id: "condition_has_mark",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: ConditionType.HAS_MARK,
  name: "拥有标记",
  description: "检查目标是否拥有指定标记及层数",
  params: [
    {
      key: "markId",
      label: "标记",
      type: "mark",
      default: "",
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
      key: "count",
      label: "层数",
      type: "number",
      min: 1,
      max: 99,
      default: 1,
      required: true
    }
  ]
};
