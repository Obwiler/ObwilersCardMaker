import type { ICard, ISkill, IEffectInstance, IValidationResult } from "@/atomic";
import { ValidationLevel } from "@/atomic";
import { configManager } from "../store/configManager";

/**
 * 创建校验成功结果
 */
function successResult(): IValidationResult {
  return { success: true, errors: [], warnings: [] };
}

/**
 * 合并多个校验结果
 */
function mergeResults(results: IValidationResult[]): IValidationResult {
  const merged: IValidationResult = { success: true, errors: [], warnings: [] };
  for (const r of results) {
    if (!r.success) merged.success = false;
    merged.errors.push(...r.errors);
    merged.warnings.push(...r.warnings);
  }
  return merged;
}

/**
 * 卡牌级校验
 */
function validateCard(card: ICard): IValidationResult {
  const errors: IValidationResult["errors"] = [];
  const warnings: IValidationResult["warnings"] = [];

  // 名称校验
  if (!card.name || card.name.trim().length === 0) {
    errors.push({ ruleId: "card_name_required", level: ValidationLevel.ERROR, message: "卡牌名称不能为空" });
  } else if (card.name.length > 50) {
    errors.push({ ruleId: "card_name_length", level: ValidationLevel.ERROR, message: "卡牌名称不能超过 50 个字符" });
  }

  // 属性上限校验
  const maxAttr = configManager.getAll()["maxAttributeValues"] as Record<string, number> | undefined;
  if (maxAttr && card.baseStats) {
    for (const [attr, value] of Object.entries(card.baseStats)) {
      if (typeof value !== "number") continue;
      const max = maxAttr[attr];
      if (max !== undefined && value > max) {
        errors.push({
          ruleId: "attribute_max_exceeded",
          level: ValidationLevel.ERROR,
          message: `${attr} 属性值 ${value} 超过上限 ${max}`
        });
      }
    }
  }

  // 技能数量校验
  if (card.skills.length > 5) {
    errors.push({ ruleId: "skill_count_max", level: ValidationLevel.ERROR, message: "技能数量不能超过 5 个" });
  }

  // 标签数量校验
  if (card.tags && card.tags.length > 10) {
    errors.push({ ruleId: "tag_count_max", level: ValidationLevel.ERROR, message: "标签数量不能超过 10 个" });
  }

  if (errors.length === 0 && warnings.length === 0) return successResult();
  return { success: errors.length === 0, errors, warnings };
}

/**
 * 技能级校验
 */
function validateSkill(skill: ISkill): IValidationResult {
  const errors: IValidationResult["errors"] = [];
  const warnings: IValidationResult["warnings"] = [];

  const range = configManager.getCooldownRange();
  if (skill.cooldown < range.min || skill.cooldown > range.max) {
    errors.push({
      ruleId: "skill_cooldown_range",
      level: ValidationLevel.ERROR,
      message: `冷却时间 ${skill.cooldown} 不在允许范围 [${range.min}, ${range.max}]`
    });
  }

  if (skill.useLimit < 0 || skill.useLimit > 99) {
    errors.push({
      ruleId: "skill_use_limit_range",
      level: ValidationLevel.ERROR,
      message: `使用次数 ${skill.useLimit} 不在允许范围 [0, 99]`
    });
  }

  if (errors.length === 0 && warnings.length === 0) return successResult();
  return { success: errors.length === 0, errors, warnings };
}

/**
 * 原子级校验（效果实例）
 */
function validateEffectInstance(effect: IEffectInstance): IValidationResult {
  const errors: IValidationResult["errors"] = [];

  if (!effect.effectId || effect.effectId.trim().length === 0) {
    errors.push({ ruleId: "effect_id_required", level: ValidationLevel.ERROR, message: "效果 ID 不能为空" });
  }

  if (!effect.params || typeof effect.params !== "object") {
    errors.push({ ruleId: "effect_params_required", level: ValidationLevel.ERROR, message: "效果参数不能为空" });
  }

  if (errors.length === 0) return successResult();
  return { success: false, errors, warnings: [] };
}

/**
 * 全量校验聚合
 */
function validateAll(card: ICard): IValidationResult {
  const results: IValidationResult[] = [];

  // 卡牌级
  results.push(validateCard(card));

  // 技能级
  for (const skill of card.skills) {
    results.push(validateSkill(skill));
    // 原子级 - 效果实例
    for (const effect of skill.effects) {
      results.push(validateEffectInstance(effect));
    }
  }

  return mergeResults(results);
}

export { validateCard, validateSkill, validateEffectInstance, validateAll };
