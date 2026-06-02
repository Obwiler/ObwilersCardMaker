import type { IAtomicEffect, IAtomicCondition, IAtomicCost } from "@/atomic";
import { EffectType, ConditionType, CostType } from "@/atomic";

// ─── 效果模板 ───────────────────────────────────────────
import { dealDamageEffect } from "./effects/effect-deal-damage";
import { restoreLifeEffect } from "./effects/effect-restore-life";
import { gainArmorEffect } from "./effects/effect-gain-armor";
import { loseArmorEffect } from "./effects/effect-lose-armor";
import { gainEnergyEffect } from "./effects/effect-gain-energy";
import { loseEnergyEffect } from "./effects/effect-lose-energy";
import { drawCardEffect } from "./effects/effect-draw-card";
import { discardCardEffect } from "./effects/effect-discard-card";
import { addMarkEffect } from "./effects/effect-add-mark";
import { removeMarkEffect } from "./effects/effect-remove-mark";
import { modifyAttributeEffect } from "./effects/effect-modify-attribute";
import { movePositionEffect } from "./effects/effect-move-position";
import { switchPositionEffect } from "./effects/effect-switch-position";
import { summonEffect } from "./effects/effect-summon";
import { destroyEffect } from "./effects/effect-destroy";
import { stunEffect } from "./effects/effect-stun";
import { silenceEffect } from "./effects/effect-silence";
import { tauntEffect } from "./effects/effect-taunt";
import { stealthEffect } from "./effects/effect-stealth";
import { copyCardEffect } from "./effects/effect-copy-card";
import { transformEffect } from "./effects/effect-transform";
import { discoverEffect } from "./effects/effect-discover";
import { recycleEffect } from "./effects/effect-recycle";
import { delayedEffect } from "./effects/effect-delayed-effect";
import { executeEffect } from "./effects/effect-execute";

// ─── 条件模板 ───────────────────────────────────────────
import { hasMarkCondition } from "./conditions/condition-has-mark";
import { attributeCheckCondition } from "./conditions/condition-attribute-check";
import { cardInHandCondition } from "./conditions/condition-card-in-hand";
import { unitCountCondition } from "./conditions/condition-unit-count";
import { positionCheckCondition } from "./conditions/condition-position-check";
import { turnCheckCondition } from "./conditions/condition-turn-check";
import { randomChanceCondition } from "./conditions/condition-random-chance";
import { comboCheckCondition } from "./conditions/condition-combo-check";
import { equipmentCheckCondition } from "./conditions/condition-equipment-check";
import { aliveCheckCondition } from "./conditions/condition-alive-check";
import { distanceCheckCondition } from "./conditions/condition-distance-check";
import { energyCheckCondition } from "./conditions/condition-energy-check";

// ─── 消耗模板 ───────────────────────────────────────────
import { payLifeCost } from "./costs/cost-pay-life";
import { payEnergyCost } from "./costs/cost-pay-energy";
import { payArmorCost } from "./costs/cost-pay-armor";
import { discardCardCost } from "./costs/cost-discard-card";
import { destroyEquipmentCost } from "./costs/cost-destroy-equipment";
import { consumeMarkCost } from "./costs/cost-consume-mark";
import { skipDrawCost } from "./costs/cost-skip-draw";
import { sacrificeUnitCost } from "./costs/cost-sacrifice-unit";

// ─── 模板注册表 ─────────────────────────────────────────

const effectTemplates: Record<string, IAtomicEffect> = {
  [EffectType.DEAL_DAMAGE]: dealDamageEffect,
  [EffectType.RESTORE_LIFE]: restoreLifeEffect,
  [EffectType.GAIN_ARMOR]: gainArmorEffect,
  [EffectType.LOSE_ARMOR]: loseArmorEffect,
  [EffectType.GAIN_ENERGY]: gainEnergyEffect,
  [EffectType.LOSE_ENERGY]: loseEnergyEffect,
  [EffectType.DRAW_CARD]: drawCardEffect,
  [EffectType.DISCARD_CARD]: discardCardEffect,
  [EffectType.ADD_MARK]: addMarkEffect,
  [EffectType.REMOVE_MARK]: removeMarkEffect,
  [EffectType.MODIFY_ATTRIBUTE]: modifyAttributeEffect,
  [EffectType.MOVE_POSITION]: movePositionEffect,
  [EffectType.SWITCH_POSITION]: switchPositionEffect,
  [EffectType.SUMMON]: summonEffect,
  [EffectType.DESTROY]: destroyEffect,
  [EffectType.STUN]: stunEffect,
  [EffectType.SILENCE]: silenceEffect,
  [EffectType.TAUNT]: tauntEffect,
  [EffectType.STEALTH]: stealthEffect,
  [EffectType.COPY_CARD]: copyCardEffect,
  [EffectType.TRANSFORM]: transformEffect,
  [EffectType.DISCOVER]: discoverEffect,
  [EffectType.RECYCLE]: recycleEffect,
  [EffectType.DELAYED_EFFECT]: delayedEffect,
  [EffectType.EXECUTE]: executeEffect
};

const conditionTemplates: Record<string, IAtomicCondition> = {
  [ConditionType.HAS_MARK]: hasMarkCondition,
  [ConditionType.ATTRIBUTE_CHECK]: attributeCheckCondition,
  [ConditionType.CARD_IN_HAND]: cardInHandCondition,
  [ConditionType.UNIT_COUNT]: unitCountCondition,
  [ConditionType.POSITION_CHECK]: positionCheckCondition,
  [ConditionType.TURN_CHECK]: turnCheckCondition,
  [ConditionType.RANDOM_CHANCE]: randomChanceCondition,
  [ConditionType.COMBO_CHECK]: comboCheckCondition,
  [ConditionType.EQUIPMENT_CHECK]: equipmentCheckCondition,
  [ConditionType.ALIVE_CHECK]: aliveCheckCondition,
  [ConditionType.DISTANCE_CHECK]: distanceCheckCondition,
  [ConditionType.ENERGY_CHECK]: energyCheckCondition
};

const costTemplates: Record<string, IAtomicCost> = {
  [CostType.PAY_LIFE]: payLifeCost,
  [CostType.PAY_ENERGY]: payEnergyCost,
  [CostType.PAY_ARMOR]: payArmorCost,
  [CostType.DISCARD_CARD]: discardCardCost,
  [CostType.DESTROY_EQUIPMENT]: destroyEquipmentCost,
  [CostType.CONSUME_MARK]: consumeMarkCost,
  [CostType.SKIP_DRAW]: skipDrawCost,
  [CostType.SACRIFICE_UNIT]: sacrificeUnitCost
};

// ─── 便捷获取函数 ───────────────────────────────────────

function getAllEffectTemplates(): IAtomicEffect[] {
  return Object.values(effectTemplates);
}

function getAllConditionTemplates(): IAtomicCondition[] {
  return Object.values(conditionTemplates);
}

function getAllCostTemplates(): IAtomicCost[] {
  return Object.values(costTemplates);
}

function getEffectTemplate(type: EffectType): IAtomicEffect | undefined {
  return effectTemplates[type];
}

function getConditionTemplate(type: ConditionType): IAtomicCondition | undefined {
  return conditionTemplates[type];
}

function getCostTemplate(type: CostType): IAtomicCost | undefined {
  return costTemplates[type];
}

export {
  // 注册表
  effectTemplates,
  conditionTemplates,
  costTemplates,
  // 函数
  getAllEffectTemplates,
  getAllConditionTemplates,
  getAllCostTemplates,
  getEffectTemplate,
  getConditionTemplate,
  getCostTemplate,
  // 独立模板导出（供按需引用）
  dealDamageEffect,
  restoreLifeEffect,
  gainArmorEffect,
  loseArmorEffect,
  gainEnergyEffect,
  loseEnergyEffect,
  drawCardEffect,
  discardCardEffect,
  addMarkEffect,
  removeMarkEffect,
  modifyAttributeEffect,
  movePositionEffect,
  switchPositionEffect,
  summonEffect,
  destroyEffect,
  stunEffect,
  silenceEffect,
  tauntEffect,
  stealthEffect,
  copyCardEffect,
  transformEffect,
  discoverEffect,
  recycleEffect,
  delayedEffect,
  hasMarkCondition,
  attributeCheckCondition,
  cardInHandCondition,
  unitCountCondition,
  positionCheckCondition,
  turnCheckCondition,
  randomChanceCondition,
  comboCheckCondition,
  equipmentCheckCondition,
  aliveCheckCondition,
  distanceCheckCondition,
  energyCheckCondition,
  payLifeCost,
  payEnergyCost,
  payArmorCost,
  discardCardCost,
  destroyEquipmentCost,
  consumeMarkCost,
  skipDrawCost,
  sacrificeUnitCost
};
