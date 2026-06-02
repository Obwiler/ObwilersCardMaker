import { ConditionType, ParamType, type IAtomicCondition } from "@/atomic";

export const attributeCheckCondition: IAtomicCondition = {
  id: "condition_attribute_check",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: ConditionType.ATTRIBUTE_CHECK,
  name: "属性检定",
  description: "检查目标的属性值是否满足条件",
  params: [
    {
      key: "attribute",
      label: "属性",
      type: ParamType.ATTRIBUTE,
      default: "",
      required: true
    },
    {
      key: "operator",
      label: "比较符",
      type: ParamType.SELECT,
      options: [
        { label: ">=", value: ">=" },
        { label: "<=", value: "<=" },
        { label: "=", value: "=" },
        { label: "!=", value: "!=" },
        { label: ">", value: ">" },
        { label: "<", value: "<" }
      ],
      default: ">=",
      required: true
    },
    {
      key: "value",
      label: "比较值",
      type: ParamType.NUMBER,
      min: 0,
      max: 999,
      default: 0,
      required: true
    },
    {
      key: "target",
      label: "检定目标",
      type: ParamType.SELECT,
      options: [
        { label: "自身", value: "self" },
        { label: "敌方", value: "enemy" },
        { label: "友方", value: "ally" },
        { label: "全体敌方", value: "all_enemies" },
        { label: "全体友方", value: "all_allies" },
        { label: "全体", value: "all" },
        { label: "随机敌方", value: "random_enemy" },
        { label: "随机友方", value: "random_ally" }
      ],
      default: "self",
      required: true
    }
  ]
};
