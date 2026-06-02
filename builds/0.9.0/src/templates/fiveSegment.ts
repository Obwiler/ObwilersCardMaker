/**
 * fiveSegment.ts — 五段式效果编辑器模板数据
 * @version 0.9.0
 *
 * 本文件仅输出纯数据常量，不依赖 atomic/interfaces.ts 以避免循环依赖。
 * 所有类型通过内联别名定义，与 IConditionTemplate / IObjectTemplate / INoteTemplate 结构对齐。
 */

/* ================================================================
 * 内联类型定义（仅用于标注，不导出）
 * ================================================================ */

type ParamDef = {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  description?: string;
};

type ConditionTemplate = {
  id: string;
  category: 'cost' | 'trigger' | 'state' | 'limit';
  template: string;
  description: string;
  params?: ParamDef[];
};

type ObjectTemplate = {
  id: string;
  category: 'numeric' | 'card' | 'mark' | 'resource' | 'compound';
  template: string;
  description: string;
  params?: ParamDef[];
};

type NoteTemplate = {
  id: string;
  category: 'frequency' | 'cap' | 'mutual_exclusion' | 'extended';
  template: string;
  description: string;
  params?: ParamDef[];
};

type PredicateGroup = {
  groupName: string;
  predicates: string[];
};

/* ================================================================
 * 1. 条件模板 (Condition Templates)
 * ================================================================ */

export const FIVESEG_CONDITION_TEMPLATES: ConditionTemplate[] = [
  {
    id: 'cond_cost_energy',
    category: 'cost',
    template: '消耗{N}点技力',
    description: '消耗技力为条件',
    params: [{ name: 'N', type: 'number', required: true, description: '消耗的技力数值' }],
  },
  {
    id: 'cond_cost_hp',
    category: 'cost',
    template: '消耗{N}点生命',
    description: '消耗生命为条件',
    params: [{ name: 'N', type: 'number', required: true, description: '消耗的生命数值' }],
  },
  {
    id: 'cond_timing_trigger',
    category: 'trigger',
    template: '当{事件}时',
    description: '时机触发条件',
    params: [{ name: '事件', type: 'string', required: true, description: '触发时机名称' }],
  },
  {
    id: 'cond_state_attr',
    category: 'state',
    template: '{属性} ≥ {N}',
    description: '属性状态判定',
    params: [
      { name: '属性', type: 'string', required: true, description: '属性名称（如攻击力、生命值）' },
      { name: 'N', type: 'number', required: true, description: '判定阈值' },
    ],
  },
  {
    id: 'cond_state_hp_below',
    category: 'state',
    template: '目标生命 < {N}%',
    description: '低生命状态',
    params: [{ name: 'N', type: 'number', required: true, description: '生命百分比阈值' }],
  },
  {
    id: 'cond_limit_per_turn',
    category: 'limit',
    template: '每回合限{N}次',
    description: '回合次数限制',
    params: [{ name: 'N', type: 'number', required: true, description: '每回合最大次数' }],
  },
  {
    id: 'cond_limit_per_game',
    category: 'limit',
    template: '每场对局限{N}次',
    description: '对局次数限制',
    params: [{ name: 'N', type: 'number', required: true, description: '每场对局最大次数' }],
  },
  {
    id: 'cond_state_has_mark',
    category: 'state',
    template: '持有{标记}',
    description: '持有标记状态',
    params: [{ name: '标记', type: 'string', required: true, description: '标记名称' }],
  },
  {
    id: 'cond_state_equipped',
    category: 'state',
    template: '已装备{装备}',
    description: '装备状态',
    params: [{ name: '装备', type: 'string', required: true, description: '装备名称' }],
  },
  {
    id: 'cond_pas',
    category: 'trigger',
    template: '被动',
    description: '被动触发（无条件）',
    params: [],
  },
];

/* ================================================================
 * 2. 对象模板 (Object / Effect Templates)
 * ================================================================ */

export const FIVESEG_OBJECT_TEMPLATES: ObjectTemplate[] = [
  {
    id: 'obj_damage_phys',
    category: 'numeric',
    template: '{N}点物理伤害',
    description: '物理伤害数值',
    params: [{ name: 'N', type: 'number', required: true, description: '伤害数值' }],
  },
  {
    id: 'obj_damage_magic',
    category: 'numeric',
    template: '{N}点法术伤害',
    description: '法术伤害数值',
    params: [{ name: 'N', type: 'number', required: true, description: '伤害数值' }],
  },
  {
    id: 'obj_damage_true',
    category: 'numeric',
    template: '{N}点真实伤害',
    description: '真实伤害',
    params: [{ name: 'N', type: 'number', required: true, description: '伤害数值' }],
  },
  {
    id: 'obj_heal',
    category: 'numeric',
    template: '{N}点生命',
    description: '恢复/获得生命',
    params: [{ name: 'N', type: 'number', required: true, description: '生命数值' }],
  },
  {
    id: 'obj_armor',
    category: 'numeric',
    template: '{N}点护甲',
    description: '护甲值',
    params: [{ name: 'N', type: 'number', required: true, description: '护甲数值' }],
  },
  {
    id: 'obj_energy',
    category: 'numeric',
    template: '{N}点技力',
    description: '技力值',
    params: [{ name: 'N', type: 'number', required: true, description: '技力数值' }],
  },
  {
    id: 'obj_draw',
    category: 'card',
    template: '抽取{N}张牌',
    description: '抽牌',
    params: [{ name: 'N', type: 'number', required: true, description: '抽牌数量' }],
  },
  {
    id: 'obj_discard',
    category: 'card',
    template: '丢弃{N}张手牌',
    description: '弃牌',
    params: [{ name: 'N', type: 'number', required: true, description: '弃牌数量' }],
  },
  {
    id: 'obj_mark_add',
    category: 'mark',
    template: '添加{标记}×{N}',
    description: '添加标记',
    params: [
      { name: '标记', type: 'string', required: true, description: '标记名称' },
      { name: 'N', type: 'number', required: true, description: '标记层数' },
    ],
  },
  {
    id: 'obj_mark_remove',
    category: 'mark',
    template: '移除{标记}×{N}',
    description: '移除标记',
    params: [
      { name: '标记', type: 'string', required: true, description: '标记名称' },
      { name: 'N', type: 'number', required: true, description: '移除层数' },
    ],
  },
  {
    id: 'obj_move',
    category: 'compound',
    template: '移动至{位置}位',
    description: '移动位置',
    params: [{ name: '位置', type: 'string', required: true, description: '目标位置标识' }],
  },
  {
    id: 'obj_stun',
    category: 'compound',
    template: '眩晕{N}回合',
    description: '眩晕效果',
    params: [{ name: 'N', type: 'number', required: true, description: '持续回合数' }],
  },
];

/* ================================================================
 * 3. 备注模板 (Note Templates)
 * ================================================================ */

export const FIVESEG_NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'note_freq_turn',
    category: 'frequency',
    template: '每回合限{N}次',
    description: '每回合次数限制',
    params: [{ name: 'N', type: 'number', required: true, description: '最大次数' }],
  },
  {
    id: 'note_cap_stack',
    category: 'cap',
    template: '最多叠加{N}层',
    description: '叠加层数上限',
    params: [{ name: 'N', type: 'number', required: true, description: '最大层数' }],
  },
  {
    id: 'note_mutex',
    category: 'mutual_exclusion',
    template: '与{效果名}互斥',
    description: '互斥关系',
    params: [{ name: '效果名', type: 'string', required: true, description: '互斥的效果名称' }],
  },
  {
    id: 'note_extend',
    category: 'extended',
    template: '{说明}',
    description: '扩展说明',
    params: [{ name: '说明', type: 'string', required: true, description: '自由扩展说明文本' }],
  },
];

/* ================================================================
 * 4. 谓词语义分组 (Predicate Groups)
 * ================================================================ */

export const FIVESEG_PREDICATE_GROUPS: PredicateGroup[] = [
  {
    groupName: '造成类',
    predicates: ['deal'],
  },
  {
    groupName: '给予 / 获得类',
    predicates: ['gain', 'grant', 'draw', 'add', 'summon', 'discover', 'copy'],
  },
  {
    groupName: '失去 / 移除类',
    predicates: ['lose', 'consume', 'discard', 'remove', 'deprive', 'destroy'],
  },
  {
    groupName: '恢复 / 治疗类',
    predicates: ['restore', 'recycle'],
  },
  {
    groupName: '控制类',
    predicates: ['stun', 'silence', 'taunt', 'stealth', 'immune'],
  },
  {
    groupName: '位移 / 变形类',
    predicates: ['move', 'switch', 'transform', 'convert'],
  },
  {
    groupName: '延迟 / 反射类',
    predicates: ['delay', 'reflect', 'execute'],
  },
  {
    groupName: '未知',
    predicates: ['unknown'],
  },
];
