import { EffectType, type IAtomicEffect } from "@/atomic";

// 其他23个效果名称列表（用于 delayed_effect 的 options）
const otherEffectNames = [
  { label: "造成伤害", value: "deal_damage" },
  { label: "恢复生命", value: "restore_life" },
  { label: "获得护甲", value: "gain_armor" },
  { label: "削减护甲", value: "lose_armor" },
  { label: "获得技力", value: "gain_energy" },
  { label: "削减技力", value: "lose_energy" },
  { label: "抽牌", value: "draw_card" },
  { label: "弃牌", value: "discard_card" },
  { label: "添加标记", value: "add_mark" },
  { label: "移除标记", value: "remove_mark" },
  { label: "修改属性", value: "modify_attribute" },
  { label: "移动位置", value: "move_position" },
  { label: "交换位置", value: "switch_position" },
  { label: "召唤单位", value: "summon" },
  { label: "消灭单位", value: "destroy" },
  { label: "沉默", value: "silence" },
  { label: "嘲讽", value: "taunt" },
  { label: "隐匿", value: "stealth" },
  { label: "复制卡牌", value: "copy_card" },
  { label: "变形", value: "transform" },
  { label: "发现", value: "discover" },
  { label: "回收", value: "recycle" },
  { label: "眩晕", value: "stun" }
];

export const delayedEffect: IAtomicEffect = {
  id: "effect_delayed_effect",
  version: "1.0",
  createdAt: 0,
  updatedAt: 0,
  type: EffectType.DELAYED_EFFECT,
  name: "延迟效果",
  description: "延迟指定回合后触发一个效果",
  params: [
    {
      key: "delayTurns",
      label: "延迟回合",
      type: "number",
      min: 1,
      max: 9,
      default: 1,
      required: true
    },
    {
      key: "effectId",
      label: "延迟效果类型",
      type: "select",
      options: otherEffectNames,
      default: "deal_damage",
      required: true
    }
  ]
};
