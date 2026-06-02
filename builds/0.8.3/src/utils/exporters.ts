import type { ICard, IConditionInstance, ICostInstance, IEffectInstance, IParamDefinition } from "@/atomic";
import {
  RARITY_LABELS,
  ATTRIBUTE_LABELS,
  LOGIC_LABELS,
  AttributeType,
  EffectType,
  LogicOperator,
  TargetType
} from "@/atomic";
import { conditionTemplates, costTemplates, effectTemplates } from "@/templates";

// ─── 自然语言映射表 ─────────────────────────────────────

/** 条件目标 → 自然语言（含 TargetType 和 params.target 字符串值） */
const TARGET_NL: Record<string, string> = {
  [TargetType.SELF]: "自身",
  [TargetType.ONE_ENEMY]: "一个敌方目标",
  [TargetType.ONE_ALLY]: "一个友方目标",
  [TargetType.ONE_UNIT]: "一个目标",
  [TargetType.ALL_ENEMIES]: "所有敌方目标",
  [TargetType.ALL_ALLIES]: "所有友方目标",
  [TargetType.ALL_UNITS]: "所有目标",
  [TargetType.RANDOM_ENEMY]: "一个随机敌方目标",
  [TargetType.RANDOM_ALLY]: "一个随机友方目标",
  [TargetType.ALL_ALIVE]: "所有存活目标",
  [TargetType.ALL_DEAD]: "所有阵亡目标",
  [TargetType.ADJACENT]: "相邻单位",
  [TargetType.ADJACENT_ENEMY]: "相邻敌方目标",
  [TargetType.ADJACENT_ALLY]: "相邻友方目标",
  [TargetType.DAMAGE_SOURCE]: "伤害来源",
  [TargetType.TRIGGER_UNIT]: "触发单位",
  [TargetType.LOWEST_LIFE]: "生命最低的目标",
  [TargetType.HIGHEST_LIFE]: "生命最高的目标",
  [TargetType.LOWEST_ARMOR]: "护甲最低的目标",
  [TargetType.HIGHEST_ARMOR]: "护甲最高的目标",
  // params.target 字符串值（来自 condition 模板，仅保留不与 TargetType 枚举冲突的键）
  "enemy": "一个敌方目标",
  "ally": "一个友方目标",
  "all": "所有目标",
};

/** 属性 → 自然语言（用于条件描述） */
const ATTR_NL: Record<string, string> = {
  [AttributeType.LIFE]: "生命值",
  [AttributeType.ARMOR]: "护甲",
  [AttributeType.ATTACK]: "攻击力",
  [AttributeType.ENERGY]: "能量",
  [AttributeType.DEFENSE]: "防御力",
  [AttributeType.SPEED]: "速度",
  [AttributeType.CRIT_RATE]: "暴击率",
};

/** 比较运算符 → 自然语言 */
const COMPARISON_NL: Record<string, string> = {
  "<=": "≤",
  ">=": "≥",
  "=": "＝",
  "==": "＝",
  "!=": "≠",
  "<": "＜",
  ">": "＞",
};

// ─── 导出 JSON ──────────────────────────────────────────

function exportToJSON(card: ICard): string {
  return JSON.stringify(card, null, 2);
}

// ─── 格式化条件实例 → 自然语言子句 ─────────────────────

function formatCondition(cond: IConditionInstance): string {
  const tpl = conditionTemplates[cond.conditionId];
  if (!tpl) return "未知条件";

  const params = cond.params;

  // 目标：优先使用顶层 TargetType，其次 params.target 字符串
  const targetType = cond.target as string;
  const paramsTarget = params?.["target"] as string | undefined;
  const targetStr =
    TARGET_NL[targetType] ??
    (paramsTarget ? TARGET_NL[paramsTarget] ?? paramsTarget : undefined) ??
    "目标";

  // 属性
  const attr = params?.["attribute"] as string | undefined;
  const attrLabel = attr
    ? (ATTR_NL[attr] ?? ATTRIBUTE_LABELS[attr as AttributeType] ?? attr)
    : "";

  // 比较符
  const op = params?.["operator"] as string | undefined;
  const opLabel = op ? (COMPARISON_NL[op] ?? op) : "";

  // 值
  const value = params?.["value"];
  const valueStr = value !== undefined && value !== null && value !== "" ? String(value) : "";

  if (attrLabel && opLabel && valueStr) {
    // 属性检定格式：「目标 的 属性 比较符 值」
    return `${targetStr} 的 ${attrLabel} ${opLabel} ${valueStr}`;
  }

  // 兜底：模板名 + 参数拼接
  const paramsStr = formatParams(params as Record<string, unknown>, tpl.params);
  return `${targetStr}${tpl.name}${paramsStr ? "：" + paramsStr : ""}`;
}

// ─── 格式化消耗实例 → 自然语言子句 ─────────────────────

function formatCost(cost: ICostInstance): string {
  const tpl = costTemplates[cost.costId];
  if (!tpl) return "未知消耗";
  const params = formatParams(cost.params, tpl.params);
  return `${tpl.name}${params ? "：" + params : ""}`;
}

// ─── 格式化效果实例 → 自然语言子句 ─────────────────────

function formatEffect(eff: IEffectInstance): string {
  const tpl = effectTemplates[eff.effectId];
  if (!tpl) return "未知效果";

  const params = eff.params;

  // EXECUTE（淘汰/处决）
  if (eff.effectId === EffectType.EXECUTE || tpl.type === EffectType.EXECUTE) {
    const skipNearDeath = params?.["skipNearDeath"] !== false; // 默认 true
    return "直接将其淘汰" + (skipNearDeath ? "，跳过濒死阶段" : "");
  }

  // DEAL_DAMAGE（造成伤害）
  if (eff.effectId === EffectType.DEAL_DAMAGE || tpl.type === EffectType.DEAL_DAMAGE) {
    const value = params?.["value"] ?? 0;
    const damageType = params?.["damageType"] as string | undefined;
    const typeLabel = damageType === "true" ? "真实" : "";
    return `造成 ${value} 点${typeLabel}伤害`;
  }

  // RESTORE_LIFE（恢复生命）
  if (eff.effectId === EffectType.RESTORE_LIFE || tpl.type === EffectType.RESTORE_LIFE) {
    const value = params?.["value"] ?? 0;
    return `恢复 ${value} 点生命值`;
  }

  // GAIN_ARMOR（获得护甲）
  if (eff.effectId === EffectType.GAIN_ARMOR || tpl.type === EffectType.GAIN_ARMOR) {
    const value = params?.["value"] ?? 0;
    return `获得 ${value} 点护甲`;
  }

  // LOSE_ARMOR（失去护甲）
  if (eff.effectId === EffectType.LOSE_ARMOR || tpl.type === EffectType.LOSE_ARMOR) {
    const value = params?.["value"] ?? 0;
    return `失去 ${value} 点护甲`;
  }

  // DRAW_CARD（抽牌）
  if (eff.effectId === EffectType.DRAW_CARD || tpl.type === EffectType.DRAW_CARD) {
    const count = params?.["count"] ?? 1;
    return `抽 ${count} 张牌`;
  }

  // DISCARD_CARD（弃牌）
  if (eff.effectId === EffectType.DISCARD_CARD || tpl.type === EffectType.DISCARD_CARD) {
    const count = params?.["count"] ?? 1;
    return `弃 ${count} 张牌`;
  }

  // DESTROY（销毁）
  if (eff.effectId === EffectType.DESTROY || tpl.type === EffectType.DESTROY) {
    return "消灭目标";
  }

  // STUN（眩晕）
  if (eff.effectId === EffectType.STUN || tpl.type === EffectType.STUN) {
    const duration = params?.["duration"] ?? 1;
    return `眩晕目标 ${duration} 回合`;
  }

  // SILENCE（沉默）
  if (eff.effectId === EffectType.SILENCE || tpl.type === EffectType.SILENCE) {
    const duration = params?.["duration"] ?? 1;
    return `沉默目标 ${duration} 回合`;
  }

  // TAUNT（嘲讽）
  if (eff.effectId === EffectType.TAUNT || tpl.type === EffectType.TAUNT) {
    return "嘲讽目标";
  }

  // STEALTH（潜行）
  if (eff.effectId === EffectType.STEALTH || tpl.type === EffectType.STEALTH) {
    return "进入潜行状态";
  }

  // SUMMON（召唤）
  if (eff.effectId === EffectType.SUMMON || tpl.type === EffectType.SUMMON) {
    const count = params?.["count"] ?? 1;
    return `召唤 ${count} 个单位`;
  }

  // 兜底：模板名 + 参数
  const paramsStr = formatParams(params as Record<string, unknown>, tpl.params);
  return `${tpl.name}${paramsStr ? "：" + paramsStr : ""}`;
}

// ─── 通用 params 格式化（兜底用） ──────────────────────

function formatParams(params: Record<string, unknown>, templateParams: IParamDefinition[]): string {
  return templateParams
    .map((p) => {
      const val = params[p.key];
      if (val === undefined || val === null || val === "") return "";
      if (p.type === "attribute") return ATTRIBUTE_LABELS[val as AttributeType] ?? String(val);
      if (p.type === "select") {
        const opt = (p.options as Array<{ label: string; value: unknown }>)?.find(
          (o) => String(o.value) === String(val)
        );
        return opt?.label ?? String(val);
      }
      return String(val);
    })
    .filter(Boolean)
    .join(" ");
}

// ─── 条件目标去重 ─────────────────────────────────────

/** 当连续条件共享同一目标时，后续条件省略目标名 */
function deduplicateConditionTargets(
  conditions: IConditionInstance[],
  clauses: string[]
): string[] {
  if (conditions.length <= 1) return clauses;

  // 提取每个条件的目标 key
  const targets = conditions.map((c) => {
    const t = c.target as string;
    if (t) return t;
    const pt = c.params?.["target"] as string | undefined;
    return pt ?? "";
  });

  // 构建去重后的子句：只有第一个或目标变化时才保留目标前缀
  return clauses.map((clause, i) => {
    if (i === 0) return clause;
    if (targets[i] && targets[i] === targets[i - 1]) {
      // 与前一条件目标相同：截掉 "目标名 的 " 前缀
      const prevTargetNL = TARGET_NL[targets[i - 1]];
      if (prevTargetNL) {
        const prefix = prevTargetNL + " 的 ";
        if (clause.startsWith(prefix)) {
          return clause.slice(prefix.length);
        }
      }
    }
    return clause;
  });
}

// ─── 生成卡牌自然语言描述 ──────────────────────────────

function generateCardDescription(card: ICard): string {
  const lines: string[] = [];

  lines.push(`【${card.displayName || card.name || "未命名卡牌"}】`);

  if (card.rarity) {
    lines.push(`品质: ${RARITY_LABELS[card.rarity] ?? card.rarity}`);
  }

  // 技能描述文本（从技能中自动生成）
  const skillTexts: string[] = [];

  for (const skill of card.skills) {
    // 格式化所有条件子句
    const condClauses: string[] = [];
    if (skill.conditions.length > 0) {
      for (const cond of skill.conditions) {
        condClauses.push(formatCondition(cond));
      }
    }

    // 格式化所有消耗子句
    const costClauses: string[] = [];
    if (skill.costs.length > 0) {
      for (const cost of skill.costs) {
        costClauses.push(formatCost(cost));
      }
    }

    // 格式化所有效果子句
    const effectClauses: string[] = [];
    if (skill.effects.length > 0) {
      for (const eff of skill.effects) {
        effectClauses.push(formatEffect(eff));
      }
    }

    // 拼接技能描述
    let skillDesc = "";

    if (condClauses.length > 0) {
      // 条件去重：相同 target 省略重复目标名
      const dedupedClauses = deduplicateConditionTargets(skill.conditions, condClauses);

      // 「当 条件1 且 条件2 ... 时，效果」
      skillDesc += "当 ";
      for (let i = 0; i < dedupedClauses.length; i++) {
        if (i > 0) {
          const logic = skill.conditions[i]?.logic ?? LogicOperator.AND;
          skillDesc += ` ${LOGIC_LABELS[logic] ?? "且"} `;
        }
        skillDesc += dedupedClauses[i];
      }
      skillDesc += " 时";

      // 消耗放在条件与效果之间
      if (costClauses.length > 0) {
        skillDesc += "，消耗 " + costClauses.join("，");
      }

      if (effectClauses.length > 0) {
        skillDesc += "，" + effectClauses.join("，");
      }
    } else {
      // 无条件，直接描述效果
      if (costClauses.length > 0) {
        skillDesc += "消耗 " + costClauses.join("，") + "，";
      }
      if (effectClauses.length > 0) {
        skillDesc += effectClauses.join("，");
      }
    }

    if (skillDesc) {
      skillTexts.push(skillDesc);
    }
  }

  // 展示规则：有技能描述文本时用技能描述，否则用 description 回退
  // description 如果是占位值（等于 name/displayName）则跳过
  const descriptionIsPlaceholder =
    card.description &&
    (card.description === card.name || card.description === card.displayName);

  if (skillTexts.length > 0) {
    lines.push("");
    if (card.skills.length === 1) {
      lines.push(skillTexts[0]);
    } else {
      for (let i = 0; i < card.skills.length; i++) {
        const skill = card.skills[i];
        const cd = skill.cooldown > 0 ? `冷却 ${skill.cooldown}` : "";
        const limit = skill.useLimit > 0 ? `可用 ${skill.useLimit} 次` : "";
        const passive = skill.isPassive ? "[被动]" : "[主动]";
        const meta = [cd, limit].filter(Boolean).join("，");
        lines.push(`  ${passive} ${skill.name}${meta ? " " + meta : ""}`);
        if (skillTexts[i]) {
          lines.push(`    ${skillTexts[i]}`);
        }
        if (skill.description) {
          lines.push(`    ${skill.description}`);
        }
      }
    }
  } else if (card.description && !descriptionIsPlaceholder) {
    lines.push("");
    lines.push(card.description);
  }

  if (card.flavorText && card.flavorText !== card.name && card.flavorText !== card.displayName) {
    lines.push("");
    lines.push(`"${card.flavorText}"`);
  }

  return lines.join("\n");
}

export { exportToJSON, generateCardDescription };