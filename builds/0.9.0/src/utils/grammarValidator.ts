/** CardMaker 0.9.0 — 五段式效果语法校验引擎 */

import type {
  IFiveSegmentEffect,
  IValidationResult,
  IValidationMessage,
} from "@/atomic";
import {
  ValidationLevel,
  EffectLevel,
  SubjectType,
  PredicateType,
  NoteCategory,
  SUBJECT_LABELS,
  PREDICATE_LABELS,
} from "@/atomic";

// ═══════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════

/** 主语枚举 → 中文标签 */
export function getSubjectLabel(subject: SubjectType): string {
  return SUBJECT_LABELS[subject] ?? subject;
}

/** 谓语枚举 → 中文标签 */
export function getPredicateLabel(predicate: PredicateType): string {
  return PREDICATE_LABELS[predicate] ?? predicate;
}

// ═══════════════════════════════════════════════════════════
// 共享常量
// ═══════════════════════════════════════════════════════════

/** 28 个谓语动词的中文标签（用于规则匹配） */
const PREDICATE_VERB_KEYWORDS: string[] = Object.values(PREDICATE_LABELS).filter(
  (v) => v !== PREDICATE_LABELS.unknown,
);

/** 主语模式中文关键词（F05 匹配用） */
const SUBJECT_PATTERN_KEYWORDS = [
  "自身", "目标", "敌方", "友方", "所有", "相邻", "随机",
];

/** 合法 SubjectType 值集合 */
const VALID_SUBJECTS: Set<string> = new Set(Object.values(SubjectType));

/** 合法 PredicateType 值集合 */
const VALID_PREDICATES: Set<string> = new Set(Object.values(PredicateType));

/** 合法 NoteCategory 值集合 */
const VALID_NOTE_CATEGORIES: Set<string> = new Set(Object.values(NoteCategory));

// ═══════════════════════════════════════════════════════════
// S06 谓语-宾语兼容映射表
// ═══════════════════════════════════════════════════════════

type ObjectCategory = "numeric" | "card" | "mark" | "resource" | "compound";

/** 谓词 → 允许的宾语类别 */
const PREDICATE_OBJECT_MAP: Partial<Record<PredicateType, ObjectCategory[]>> = {
  [PredicateType.DEAL]: ["numeric"],
  [PredicateType.GAIN]: ["numeric", "resource"],
  [PredicateType.LOSE]: ["numeric", "resource"],
  [PredicateType.RESTORE]: ["numeric", "resource"],
  [PredicateType.CONSUME]: ["resource", "numeric"],
  [PredicateType.DRAW]: ["card"],
  [PredicateType.DISCARD]: ["card"],
  [PredicateType.COPY]: ["card"],
  [PredicateType.DISCOVER]: ["card"],
  [PredicateType.RECYCLE]: ["card"],
  [PredicateType.ADD]: ["mark"],
  [PredicateType.REMOVE]: ["mark"],
  [PredicateType.GRANT]: ["mark", "numeric"],
  [PredicateType.DEPRIVE]: ["mark", "numeric"],
  [PredicateType.MOVE]: ["compound"],
  [PredicateType.SWITCH]: ["compound"],
  [PredicateType.SUMMON]: ["compound"],
  [PredicateType.DESTROY]: ["compound"],
  [PredicateType.STUN]: ["compound"],
  [PredicateType.SILENCE]: ["compound"],
  [PredicateType.TAUNT]: ["compound"],
  [PredicateType.STEALTH]: ["compound"],
  [PredicateType.TRANSFORM]: ["compound"],
  [PredicateType.DELAY]: ["compound"],
  [PredicateType.EXECUTE]: ["compound"],
  [PredicateType.IMMUNE]: ["compound"],
  [PredicateType.REFLECT]: ["compound"],
  [PredicateType.CONVERT]: ["compound"],
};

/** 类别 → 关键词列表 */
const CATEGORY_KEYWORDS: Record<ObjectCategory, string[]> = {
  numeric: ["伤害", "生命", "护甲", "技力", "能量", "攻击", "防御", "速度", "暴击", "属性", "点"],
  card: ["牌", "张", "抽", "弃", "复制", "发现", "回收"],
  mark: ["标记", "层", "叠加"],
  resource: ["技力", "能量", "生命", "护甲"],
  compound: [
    "位", "回合", "眩晕", "沉默", "嘲讽", "潜行", "免疫",
    "反弹", "转化", "变形", "召唤", "摧毁", "执行", "延迟", "移动", "交换",
  ],
};

// ═══════════════════════════════════════════════════════════
// 辅助：构建 effect.id 索引
// ═══════════════════════════════════════════════════════════

function buildIdSet(effects: IFiveSegmentEffect[]): Set<string> {
  return new Set(effects.map((e) => e.id));
}

// ═══════════════════════════════════════════════════════════
// 8 条禁止规则（ERROR）
// ═══════════════════════════════════════════════════════════

function checkF01(effect: IFiveSegmentEffect): IValidationMessage | null {
  if (
    effect.subject === SubjectType.SELF &&
    effect.object.includes("敌方")
  ) {
    return {
      ruleId: "F01",
      level: ValidationLevel.ERROR,
      message: `主语为"自身"时，宾语包含"敌方"——主语自身无法对敌方直接造成效果，请修改主语或宾语`,
    };
  }
  return null;
}

function checkF02(effect: IFiveSegmentEffect): IValidationMessage | null {
  if (!effect.note) return null;
  for (const verb of PREDICATE_VERB_KEYWORDS) {
    if (effect.note.includes(verb)) {
      return {
        ruleId: "F02",
        level: ValidationLevel.ERROR,
        message: `备注中出现谓词动词"${verb}"——备注仅限频率/上限/互斥/扩展说明，动词应置于谓语栏`,
      };
    }
  }
  return null;
}

function checkF03(effect: IFiveSegmentEffect): IValidationMessage | null {
  if (!effect.note) return null;
  if (effect.note.includes("如果") || effect.note.includes("则") || effect.note.includes("否则")) {
    return {
      ruleId: "F03",
      level: ValidationLevel.ERROR,
      message: `备注中出现条件判断词——条件判断应置于条件栏，不应出现在备注中`,
    };
  }
  return null;
}

function checkF04(effect: IFiveSegmentEffect): IValidationMessage | null {
  if (!effect.note) return null;
  const formulaRegex = /\b[0-9]+\s*[\+\-\*\/]\s*[0-9]+\b/;
  if (formulaRegex.test(effect.note) || /\{[NX]\d*\}/.test(effect.note)) {
    return {
      ruleId: "F04",
      level: ValidationLevel.ERROR,
      message: `备注中包含数值公式——公式应置于效果/条件栏，不应出现在备注中`,
    };
  }
  return null;
}

function checkF05(effect: IFiveSegmentEffect): IValidationMessage | null {
  if (!effect.note) return null;
  const hasSubject = SUBJECT_PATTERN_KEYWORDS.some((kw) => effect.note!.includes(kw));
  const hasPredicate = PREDICATE_VERB_KEYWORDS.some((kw) => effect.note!.includes(kw));
  if (hasSubject && hasPredicate) {
    return {
      ruleId: "F05",
      level: ValidationLevel.ERROR,
      message: `备注中疑似包含附加效果描述——请将效果拆分至独立的五段式条目`,
    };
  }
  return null;
}

function checkF06(effect: IFiveSegmentEffect): IValidationMessage | null {
  const fields = [effect.condition, effect.object];
  for (const field of fields) {
    for (const verb of PREDICATE_VERB_KEYWORDS) {
      if (field.includes(verb)) {
        return {
          ruleId: "F06",
          level: ValidationLevel.ERROR,
          message: `条件栏/宾语栏出现谓词动词"${verb}"——该动词应置于谓语栏，复杂效果请拆分为多条`,
        };
      }
    }
  }
  return null;
}

function checkF07(
  effects: IFiveSegmentEffect[],
): IValidationMessage[] {
  const messages: IValidationMessage[] = [];

  // L1 组：按 sortOrder 排序
  const l1Effects = effects
    .filter((e) => e.level === EffectLevel.L1)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (let i = 1; i < l1Effects.length; i++) {
    const prev = l1Effects[i - 1];
    const curr = l1Effects[i];
    if (prev.subject !== curr.subject) {
      messages.push({
        ruleId: "F07",
        level: ValidationLevel.ERROR,
        message: `主语从"${getSubjectLabel(prev.subject)}"切换为"${getSubjectLabel(curr.subject)}"——主语切换建议拆分到不同技能或上层条目`,
      });
    }
  }

  // L2 组：按 parentId 分组，组内按 sortOrder 排序
  const l2Effects = effects
    .filter((e) => e.level === EffectLevel.L2 && e.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const l2ByParent = new Map<string, IFiveSegmentEffect[]>();
  for (const e of l2Effects) {
    const pid = e.parentId!;
    if (!l2ByParent.has(pid)) l2ByParent.set(pid, []);
    l2ByParent.get(pid)!.push(e);
  }

  for (const [, group] of l2ByParent) {
    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1];
      const curr = group[i];
      if (prev.subject !== curr.subject) {
        messages.push({
          ruleId: "F07",
          level: ValidationLevel.ERROR,
          message: `主语从"${getSubjectLabel(prev.subject)}"切换为"${getSubjectLabel(curr.subject)}"——主语切换建议拆分到不同技能或上层条目`,
        });
      }
    }
  }

  return messages;
}

function checkF08(
  effect: IFiveSegmentEffect,
  idSet: Set<string>,
): IValidationMessage | null {
  if (effect.level !== EffectLevel.L2 && effect.level !== EffectLevel.L3) return null;

  if (!effect.parentId || effect.parentId.trim() === "") {
    return {
      ruleId: "F08",
      level: ValidationLevel.ERROR,
      message: `L2/L3 层级条目缺少父级引用——请为该条目指定一个 L1/L2 父级`,
    };
  }

  if (!idSet.has(effect.parentId)) {
    return {
      ruleId: "F08",
      level: ValidationLevel.ERROR,
      message: `L2/L3 层级条目引用了不存在的父级 ${effect.parentId}——请检查父级ID`,
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// 8 条自检规则（WARNING）
// ═══════════════════════════════════════════════════════════

function checkS01(effect: IFiveSegmentEffect): IValidationMessage | null {
  const regex = /\{N\d*\}/;
  if (regex.test(effect.condition)) {
    return {
      ruleId: "S01",
      level: ValidationLevel.WARNING,
      message: `"条件"中发现未填写的 {N} 数值占位符——请替换为具体数值`,
    };
  }
  if (regex.test(effect.object)) {
    return {
      ruleId: "S01",
      level: ValidationLevel.WARNING,
      message: `"宾语"中发现未填写的 {N} 数值占位符——请替换为具体数值`,
    };
  }
  return null;
}

function checkS02(effect: IFiveSegmentEffect): IValidationMessage | null {
  const regex = /\{X\d*\}/;
  if (regex.test(effect.condition)) {
    return {
      ruleId: "S02",
      level: ValidationLevel.WARNING,
      message: `"条件"中发现未填写的 {X} 类型占位符——请替换为具体类型值`,
    };
  }
  if (regex.test(effect.object)) {
    return {
      ruleId: "S02",
      level: ValidationLevel.WARNING,
      message: `"宾语"中发现未填写的 {X} 类型占位符——请替换为具体类型值`,
    };
  }
  return null;
}

function checkS03(
  effect: IFiveSegmentEffect,
  effects: IFiveSegmentEffect[],
): IValidationMessage | null {
  if (effect.level !== EffectLevel.L1) return null;
  if (effect.condition !== "—" && effect.condition !== "被动") return null;

  const hasChildren = effects.some((e) => e.parentId === effect.id);
  if (hasChildren) {
    return {
      ruleId: "S03",
      level: ValidationLevel.WARNING,
      message: `条件为"${effect.condition}"的 L1 条目包含子条目——请确认子条目是否应继承此条件`,
    };
  }
  return null;
}

function checkS04(effect: IFiveSegmentEffect): IValidationMessage | null {
  if (!VALID_SUBJECTS.has(effect.subject)) {
    return {
      ruleId: "S04",
      level: ValidationLevel.WARNING,
      message: `主语"${effect.subject}"不是合法主语——请从15个主语选项中选取`,
    };
  }
  return null;
}

function checkS05(effect: IFiveSegmentEffect): IValidationMessage | null {
  if (!VALID_PREDICATES.has(effect.predicate)) {
    return {
      ruleId: "S05",
      level: ValidationLevel.WARNING,
      message: `谓语"${effect.predicate}"不在动词库中——请从28个谓语选项中选取`,
    };
  }
  return null;
}

function checkS06(effect: IFiveSegmentEffect): IValidationMessage | null {
  const allowedCategories = PREDICATE_OBJECT_MAP[effect.predicate];
  if (!allowedCategories) return null; // UNKNOWN 等无映射，跳过

  const obj = effect.object;
  if (!obj || obj === "—") return null;

  // 构建禁止类别集合
  const allCategories: ObjectCategory[] = ["numeric", "card", "mark", "resource", "compound"];
  const forbiddenCategories = allCategories.filter((c) => !allowedCategories.includes(c));

  // 检查宾语是否包含禁止类别的关键词
  for (const cat of forbiddenCategories) {
    for (const kw of CATEGORY_KEYWORDS[cat]) {
      if (obj.includes(kw)) {
        const predicateLabel = getPredicateLabel(effect.predicate);
        const allowedLabels = allowedCategories.join("/");
        return {
          ruleId: "S06",
          level: ValidationLevel.WARNING,
          message: `谓语"${predicateLabel}"的宾语可能不兼容——${predicateLabel}通常搭配${allowedLabels}，当前宾语含"${kw}"`,
        };
      }
    }
  }

  return null;
}

function checkS07(effect: IFiveSegmentEffect): IValidationMessage | null {
  if (!effect.note) return null;
  if (!effect.noteCategory || !VALID_NOTE_CATEGORIES.has(effect.noteCategory)) {
    return {
      ruleId: "S07",
      level: ValidationLevel.WARNING,
      message: `备注文本已填写但未选择分类——请从4类合法备注类型中选择`,
    };
  }
  return null;
}

function checkS08(
  effect: IFiveSegmentEffect,
  effects: IFiveSegmentEffect[],
): IValidationMessage | null {
  if (effect.level !== EffectLevel.L3) return null;
  const hasChildren = effects.some((e) => e.parentId === effect.id);
  if (hasChildren) {
    return {
      ruleId: "S08",
      level: ValidationLevel.WARNING,
      message: `L3 层级条目不允许再有子条目——五段式效果最多三层嵌套`,
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// 主校验函数
// ═══════════════════════════════════════════════════════════

/**
 * 对五段式效果数组执行 16 条语法规则校验。
 *
 * @param effects - 待校验的五段式效果数组
 * @returns 校验结果，含 errors / warnings 列表及 success 标识
 */
export function validateFiveSegmentEffects(
  effects: IFiveSegmentEffect[],
): IValidationResult {
  const errors: IValidationMessage[] = [];
  const warnings: IValidationMessage[] = [];

  // 去重集合：`effect.id|ruleId`
  const seen = new Set<string>();
  const idSet = buildIdSet(effects);

  /** 记录一条消息（自动去重） */
  function addMessage(msg: IValidationMessage, effectId: string): void {
    const key = `${effectId}|${msg.ruleId}`;
    if (seen.has(key)) return;
    seen.add(key);

    if (msg.level === ValidationLevel.ERROR) {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  for (const effect of effects) {
    // ── 逐条禁止规则 ──
    [
      checkF01,
      checkF02,
      checkF03,
      checkF04,
      checkF05,
      checkF06,
    ].forEach((fn) => {
      const msg = fn(effect);
      if (msg) addMessage(msg, effect.id);
    });

    // ── 逐条自检规则（不需外部上下文的）──
    [
      checkS01,
      checkS02,
      checkS04,
      checkS05,
      checkS06,
      checkS07,
    ].forEach((fn) => {
      const msg = fn(effect);
      if (msg) addMessage(msg, effect.id);
    });

    // ── 需要外部上下文的规则 ──
    const msgF08 = checkF08(effect, idSet);
    if (msgF08) addMessage(msgF08, effect.id);

    const msgS03 = checkS03(effect, effects);
    if (msgS03) addMessage(msgS03, effect.id);

    const msgS08 = checkS08(effect, effects);
    if (msgS08) addMessage(msgS08, effect.id);
  }

  // ── F07：跨行主语切换（在遍历外层统一执行，每条消息需要归属到具体 effect）──
  const f07Messages = checkF07(effects);
  for (const msg of f07Messages) {
    // F07 消息与 group 相关，不绑定单条 effect，直接用 ruleId 兜底
    const key = `F07|${msg.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      errors.push(msg);
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}
