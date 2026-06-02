// ─── 属性类型 ───────────────────────────────────────────
enum AttributeType {
  LIFE = "life",
  ARMOR = "armor",
  ENERGY = "energy",
  ATTACK = "attack",
  DEFENSE = "defense",
  SPEED = "speed",
  CRIT_RATE = "crit_rate",
  UNKNOWN = "unknown"
}

// ─── 卡牌类型 ───────────────────────────────────────────
enum CardType {
  BASIC = "basic",
  CAMP = "camp",
  CAREER = "career",
  BUILD_WEAPON = "build_weapon",
  BUILD_TREASURE = "build_treasure",
  BUILD_ARMOR = "build_armor",
  BUILD_MARTIAL = "build_martial",
  BUILD_SPELL = "build_spell"
}

// ─── 品质 ───────────────────────────────────────────────
enum Rarity {
  WHITE = "white",
  BLUE = "blue",
  PURPLE = "purple",
  ORANGE = "orange"
}

// ─── 时机 ───────────────────────────────────────────────
enum Timing {
  IMMEDIATE = "immediate",
  TURN_START = "turn_start",
  TURN_END = "turn_end",
  BIG_TURN_START = "big_turn_start",
  BIG_TURN_END = "big_turn_end",
  ON_DAMAGE_TAKEN = "on_damage_taken",
  ON_DAMAGE_DEALT = "on_damage_dealt",
  ON_CARD_DRAWN = "on_card_drawn",
  ON_CARD_PLAYED = "on_card_played",
  ON_CARD_DISCARDED = "on_card_discarded",
  ON_MARK_ADDED = "on_mark_added",
  ON_MARK_REMOVED = "on_mark_removed",
  PERMANENT = "permanent",
  UNKNOWN = "unknown"
}

// ─── 目标类型 ───────────────────────────────────────────
enum TargetType {
  SELF = "self",
  ONE_ENEMY = "one_enemy",
  ONE_ALLY = "one_ally",
  ONE_UNIT = "one_unit",
  DAMAGE_SOURCE = "damage_source",
  TRIGGER_UNIT = "trigger_unit",
  INHERIT = "inherit",
  ALL_ENEMIES = "all_enemies",
  ALL_ALLIES = "all_allies",
  ALL_UNITS = "all_units",
  ALL_ALIVE = "all_alive",
  ALL_DEAD = "all_dead",
  ADJACENT = "adjacent",
  ADJACENT_ENEMY = "adjacent_enemy",
  ADJACENT_ALLY = "adjacent_ally",
  LEFT_ADJACENT = "left_adjacent",
  RIGHT_ADJACENT = "right_adjacent",
  RANDOM_ENEMY = "random_enemy",
  RANDOM_ALLY = "random_ally",
  RANDOM_UNIT = "random_unit",
  LOWEST_LIFE = "lowest_life",
  HIGHEST_LIFE = "highest_life",
  LOWEST_ARMOR = "lowest_armor",
  HIGHEST_ARMOR = "highest_armor",
  LOWEST_ENERGY = "lowest_energy",
  HIGHEST_ENERGY = "highest_energy"
}

// ─── 叠加类型 ───────────────────────────────────────────
enum StackingType {
  REPLACE = "replace",
  ADD_VALUE = "add_value",
  ADD_PERCENT = "add_percent",
  ADD_COUNT = "add_count",
  UNKNOWN = "unknown"
}

// ─── 逻辑运算符 ─────────────────────────────────────────
enum LogicOperator {
  AND = "AND",
  OR = "OR",
  NOT = "NOT",
  UNKNOWN = "UNKNOWN"
}

// ─── 比较运算符 ─────────────────────────────────────────
enum ComparisonOperator {
  LT = "<",
  LTE = "<=",
  EQ = "=",
  GTE = ">=",
  GT = ">",
  NEQ = "!=",
  UNKNOWN = "unknown"
}

// ─── 标记类型 ───────────────────────────────────────────
enum MarkType {
  POSITIVE = "positive",
  NEGATIVE = "negative",
  NEUTRAL = "neutral"
}

// ─── 标记过期行为 ───────────────────────────────────────
enum MarkExpireBehavior {
  REMOVE_ALL = "remove_all",
  REMOVE_ONE = "remove_one",
  PERSIST = "persist"
}

// ─── 过滤器 ID ──────────────────────────────────────────
enum FilterId {
  FILTER_BY_ATTRIBUTE = "filter_by_attribute",
  FILTER_BY_MARK = "filter_by_mark",
  FILTER_BY_CARD_COUNT = "filter_by_card_count",
  FILTER_BY_CARD_TYPE = "filter_by_card_type",
  FILTER_BY_RELATION = "filter_by_relation",
  FILTER_BY_DISTANCE = "filter_by_distance",
  FILTER_BY_ALIVE = "filter_by_alive",
  FILTER_BY_EQUIPPED = "filter_by_equipped",
  FILTER_BY_BUFF = "filter_by_buff",
  FILTER_BY_DEBUFF = "filter_by_debuff",
  FILTER_EXCLUDE_SELF = "filter_exclude_self",
  FILTER_EXCLUDE_TARGET = "filter_exclude_target"
}

// ─── 排序器 ID ──────────────────────────────────────────
enum SorterId {
  SORT_BY_ATTRIBUTE = "sort_by_attribute",
  SORT_BY_MARK = "sort_by_mark",
  SORT_BY_DISTANCE = "sort_by_distance",
  SORT_BY_RANDOM = "sort_by_random",
  SORT_BY_PLAYER_ORDER = "sort_by_player_order"
}

// ─── 效果类型 ───────────────────────────────────────────
enum EffectType {
  DEAL_DAMAGE = "deal_damage",
  RESTORE_LIFE = "restore_life",
  GAIN_ARMOR = "gain_armor",
  LOSE_ARMOR = "lose_armor",
  GAIN_ENERGY = "gain_energy",
  LOSE_ENERGY = "lose_energy",
  DRAW_CARD = "draw_card",
  DISCARD_CARD = "discard_card",
  ADD_MARK = "add_mark",
  REMOVE_MARK = "remove_mark",
  MODIFY_ATTRIBUTE = "modify_attribute",
  MOVE_POSITION = "move_position",
  SWITCH_POSITION = "switch_position",
  SUMMON = "summon",
  DESTROY = "destroy",
  STUN = "stun",
  SILENCE = "silence",
  TAUNT = "taunt",
  STEALTH = "stealth",
  COPY_CARD = "copy_card",
  TRANSFORM = "transform",
  DISCOVER = "discover",
  RECYCLE = "recycle",
  DELAYED_EFFECT = "delayed_effect",
  EXECUTE = "execute"
}

// ─── 条件类型 ───────────────────────────────────────────
enum ConditionType {
  HAS_MARK = "has_mark",
  ATTRIBUTE_CHECK = "attribute_check",
  CARD_IN_HAND = "card_in_hand",
  UNIT_COUNT = "unit_count",
  POSITION_CHECK = "position_check",
  TURN_CHECK = "turn_check",
  RANDOM_CHANCE = "random_chance",
  COMBO_CHECK = "combo_check",
  EQUIPMENT_CHECK = "equipment_check",
  ALIVE_CHECK = "alive_check",
  DISTANCE_CHECK = "distance_check",
  ENERGY_CHECK = "energy_check"
}

// ─── 消耗类型 ───────────────────────────────────────────
enum CostType {
  PAY_LIFE = "pay_life",
  PAY_ENERGY = "pay_energy",
  PAY_ARMOR = "pay_armor",
  DISCARD_CARD = "discard_card",
  DESTROY_EQUIPMENT = "destroy_equipment",
  CONSUME_MARK = "consume_mark",
  SKIP_DRAW = "skip_draw",
  SACRIFICE_UNIT = "sacrifice_unit"
}

// ─── 校验级别 ───────────────────────────────────────────
enum ValidationLevel {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info"
}

// ─── 排序方向 ───────────────────────────────────────────
enum SortOrder {
  ASC = "asc",
  DESC = "desc"
}

// ─── 关系类型 ───────────────────────────────────────────
enum RelationType {
  ENEMY = "enemy",
  ALLY = "ally",
  NEUTRAL = "neutral"
}

// ─── 卡牌品类 ───────────────────────────────────────────
enum CardCategory {
  WEAPON = "weapon",
  TREASURE = "treasure",
  ARMOR = "armor",
  MARTIAL = "martial",
  SPELL = "spell"
}

// ─── 参数类型 ───────────────────────────────────────────
enum ParamType {
  NUMBER = "number",
  STRING = "string",
  SELECT = "select",
  BOOLEAN = "boolean",
  MARK = "mark",
  ATTRIBUTE = "attribute"
}

export {
  AttributeType, CardType, Rarity, Timing, TargetType,
  StackingType, LogicOperator, ComparisonOperator, MarkType,
  MarkExpireBehavior, FilterId, SorterId, EffectType,
  ConditionType, CostType, ValidationLevel, SortOrder,
  RelationType, CardCategory, ParamType
};
