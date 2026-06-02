import { ConditionType, type IAtomicCondition } from "@/atomic";

export const cardInHandCondition: IAtomicCondition = {
  id: "condition_card_in_hand",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: ConditionType.CARD_IN_HAND,
  name: "手牌检测",
  description: "检测目标的手牌数量",
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
