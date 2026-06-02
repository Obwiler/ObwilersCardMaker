import { ConditionType, type IAtomicCondition } from "@/atomic";

export const aliveCheckCondition: IAtomicCondition = {
  id: "condition_alive_check",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: ConditionType.ALIVE_CHECK,
  name: "存活检测",
  description: "检测目标是否存活",
  params: [
    {
      key: "isAlive",
      label: "存活状态",
      type: "boolean",
      default: true,
      required: true
    }
  ]
};
