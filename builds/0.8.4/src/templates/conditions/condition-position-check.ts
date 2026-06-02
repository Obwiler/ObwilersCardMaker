import { ConditionType, type IAtomicCondition } from "@/atomic";

export const positionCheckCondition: IAtomicCondition = {
  id: "condition_position_check",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: ConditionType.POSITION_CHECK,
  name: "位置检定",
  description: "检查目标的位置特征",
  params: [
    {
      key: "position",
      label: "位置",
      type: "select",
      options: [
        { label: "最左", value: "leftmost" },
        { label: "最右", value: "rightmost" },
        { label: "中间", value: "middle" },
        { label: "非边缘", value: "not_edge" }
      ],
      default: "leftmost",
      required: true
    }
  ]
};
