import { ConditionType, type IAtomicCondition } from "@/atomic";

export const randomChanceCondition: IAtomicCondition = {
  id: "condition_random_chance",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: ConditionType.RANDOM_CHANCE,
  name: "概率触发",
  description: "以指定概率触发",
  params: [
    {
      key: "probability",
      label: "触发概率(%)",
      type: "number",
      min: 1,
      max: 100,
      default: 50,
      required: true
    }
  ]
};
