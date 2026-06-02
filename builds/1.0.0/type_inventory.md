# ObwilerCardMaker 类型清单与重复分析报告

> **版本**: 1.0.0  
> **日期**: 2026-06-01  
> **目的**: 为 Domain 层统一做准备，建立重复类型映射表  
> **前置**: `builds/1.0.0/architecture_refactor_plan.md`

---

## 表1：core 现有类型清单

| 类型 | 类别 | 字段 / 变体 | 文件 |
|------|------|-----------|------|
| `CardId` | type alias | `String` | core/src/card.rs |
| `Card` | struct | `id: CardId`, `name: String`, `tags: Vec<String>`, `text: String` | core/src/card.rs |
| `Zone` | enum | `Deck`, `Hand`, `Field`, `Graveyard`, `Exile` | core/src/card.rs |
| `Stat` | struct | `name: String`, `value: i32` | core/src/card.rs |
| `Tag` | struct | `id: String`, `name: String`, `color: String`, `description: String` | core/src/tag.rs |
| `Mark` | struct | `id: String`, `tag_id: String`, `card_id: String`, `note: String` | core/src/tag.rs |
| `CoreError` | enum | `NotFound { entity, id }`, `ParseError { card, detail }`, `ValidateError { card, detail }`, `DuelError { detail }`, `IoError { detail }` | core/src/error.rs |

**总计**: 1 个 type alias + 4 个 struct + 2 个 enum = **7 个 pub 类型**

---

## 表2：各 crate 重复类型映射

### 2.1 核心重复（结构完全相同或语义等价）

| 重复类型位置 | 在 core 中的对应 | 重复程度 | 说明 |
|-------------|-----------------|:-------:|------|
| `parser::card_data::Card` | `core::Card` | **超集** | parser 的 Card 多了 `list_tags/pre_tag/duel_tags/ast/errors/created_at/modified_at`。core 的 Card 是基础视图，parser 的 Card 是完整运行时视图。两者应合一，core 定义基础字段，parser 补充运行时字段。 |
| `duel::effect::CardEntry` | `parser::parser::CardEntry` | **完全相同** | 两个 crate 各自定义了字段完全一致的 struct：`id, condition, subject, predicate, object, note`。duel 注释中甚至写明"由胶水层负责转换"。应统一为 core 的共享类型。 |
| `tag::Tag` | `core::Tag` | **语义冲突** | 两者都叫 Tag 但字段完全不同：core 是轻量视图（id/name/color/description），tag 是完整数据模型（tag_id/name/skill_entries/first_appearance/design_intent）。必须重命名其一。 |
| `tag::Mark` | `core::Mark` | **语义冲突** | 两者都叫 Mark 但语义不同：core 的 Mark 是标签实例关联（id/tag_id/card_id/note），tag 的 Mark 是标记字典条目（mark_id/name）。必须重命名其一。 |

### 2.2 结构重复（字段集相同但语义不同）

| 类型 | 位置 | 说明 |
|------|------|------|
| `TagEntry` | `parser::parser` | 标签定义块中的子条目：`id, condition, subject, predicate, object, note` |
| `CardEntry` | `parser::parser` | 五段式条目：`id, condition, subject, predicate, object, note` |
| `CardEntry` | `duel::effect` | 五段式条目副本：`id, condition, subject, predicate, object, note` |

**结论**: 这三个 struct 的字段集完全一致（id + 五段 condition/subject/predicate/object/note），应统一为 `core::FiveStageEntry` 并在 core 中定义，parser 和 duel 共享使用。

---

## 表3：各 crate 独有类型

### 3.1 parser crate 独有类型

| 类型 | 类别 | 用途 | 文件 |
|------|------|------|------|
| `MetaInfo` | struct | cards.json 的 _meta 元信息 | card_data.rs |
| `JsonValidationError` | struct | JSON 校验错误详情 | data_gov.rs |
| `JsonValidationResult` | struct | JSON 校验结果 | data_gov.rs |
| `DuplicatePair` | struct | 疑似重复卡牌对 | data_gov.rs |
| `ExportData` | struct | 导出数据包装 | data_gov.rs |
| `ExportMeta` | struct | 导出元信息 | data_gov.rs |
| `ImportResult` | struct | 导入结果统计 | data_gov.rs |
| `Token` | enum | 词法分析 Token 类型（27 个变体） | lexer.rs |
| `Lexer` | struct | 词法分析器 | lexer.rs |
| `CardAst` | struct | 卡牌 AST（解析后的抽象语法树） | parser.rs |
| `TagDef` | struct | 标签定义块 | parser.rs |
| `ParseError` | struct | 解析错误 | parser.rs |
| `ParseResult` | struct | 解析结果 | parser.rs |
| `ParseStats` | struct | 解析统计 | lib.rs |
| `ValidationError` | struct | 校验错误 | validator.rs |
| `CardValidation` | struct | 卡牌校验结果 | validator.rs |

**总计**: 16 个独有类型

### 3.2 duel crate 独有类型

| 类型 | 类别 | 用途 | 文件 |
|------|------|------|------|
| `EffectType` | enum | 效果类型枚举（35+ 变体） | effect.rs |
| `TriggerCondition` | enum | 触发条件枚举（9 个变体） | effect.rs |
| `TargetSelector` | enum | 目标选择器枚举（8 个变体） | effect.rs |
| `Effect` | struct | 可执行的效果对象 | effect.rs |
| `DuelManager` | struct | 全局对峙状态管理器 | lib.rs |
| `EffectLogStore` | struct | 效果日志暂存 | lib.rs |
| `PhaseInfo` | struct | 对峙阶段信息（辅助类型） | lib.rs |
| `ScenarioCondition` | struct | 场景匹配条件 | scenario.rs |
| `ScenarioPlayer` | struct | 场景玩家配置 | scenario.rs |
| `Scenario` | struct | 预设场景 | scenario.rs |
| `ScenarioMatch` | struct | 场景匹配结果 | scenario.rs |
| `CardInfo` | struct | 卡牌信息（简化版，用于场景匹配） | scenario.rs |
| `DuelPhase` | enum | 对峙阶段（5 个变体） | state.rs |
| `PlayerSide` | enum | 玩家阵营（First/Second） | state.rs |
| `DamageType` | enum | 伤害类型（Physical/Magical/True） | state.rs |
| `PlayerField` | struct | 玩家场地状态（19 个字段） | state.rs |
| `EffectStackEntry` | struct | 效果栈条目 | state.rs |
| `DuelState` | struct | 对峙全局状态 | state.rs |
| `EffectLogEntry` | struct | 效果日志条目 | state.rs |
| `DuelResult` | enum | 对峙结果 | state.rs |

**总计**: 20 个独有类型

### 3.3 tag crate 独有类型

| 类型 | 类别 | 用途 | 文件 |
|------|------|------|------|
| `SkillEntry` | struct | 技能词条（A/B/C 三级） | types.rs |

**总计**: 1 个独有类型（Tag 和 Mark 已计入重复）

### 3.4 devtools crate 独有类型

| 类型 | 类别 | 用途 | 文件 |
|------|------|------|------|
| `CheckResult` | struct | 单项检查结果 | lib.rs |
| `HealthReport` | struct | 健康检查报告 | lib.rs |
| `ErrorEntry` | struct | 错误日志条目 | lib.rs |

**总计**: 3 个独有类型

---

## 总结：建议的迁移方案

### 重复类型统计

| 指标 | 数量 |
|------|:---:|
| core 总类型数 | 7 |
| 发现的结构完全相同重复 | 3 组 |
| 语义冲突的类型名 | 2 组（Tag, Mark） |
| 字段集相同但用途不同的类型 | 3 个（CardEntry×2 + TagEntry） |
| 各 crate 独有类型合计 | 40 |

### 迁移建议

#### 阶段一：消除硬重复（立即执行）

**1. 统一 `FiveStageEntry`（核心五段式条目）**

将以下三个 struct 合并为 `core::FiveStageEntry`：

```
parser::parser::CardEntry   ──┐
parser::parser::TagEntry     ──┼──→ core::FiveStageEntry { id, condition, subject, predicate, object, note }
duel::effect::CardEntry      ──┘
```

操作：在 `core/src/card.rs` 中新增 `FiveStageEntry` struct，parser 和 duel 通过 `use cardmaker_core::FiveStageEntry` 引用。

**2. 统一 `Card` 实体**

```
core::Card (4 字段) ──→ core::Card (完整版，包含 runtime 字段)
parser::Card (10 字段) ──┘
```

操作：
- 将 `list_tags/pre_tag/duel_tags/ast/errors/created_at/modified_at` 上提到 core::Card
- Card 中 `ast: Option<CardAst>` 改为依赖 `FiveStageEntry` 来表示五段式条目
- parser 不再定义自己的 `Card` struct，直接使用 `core::Card`

#### 阶段二：解决命名冲突（同步执行）

**3. 重命名区分 Tag / Mark**

| 当前 | 冲突 | 建议 |
|------|:---:|------|
| `core::Tag` | 与 `tag::Tag` 同名不同义 | 合并到 `tag::Tag`，core 不再单独定义 Tag |
| `core::Mark` | 与 `tag::Mark` 同名不同义 | 将 `core::Mark` 重命名为 `CardMark`（卡牌上的标记实例），`tag::Mark` 保留为标记字典条目 |

操作：
- `core::Mark` → `core::CardMark { id, tag_id, card_id, note }` （表示"某卡牌被赋予的某标签实例"）
- `tag::Mark` 保持不变（表示标记字典中预定义的标记名）
- `core::Tag` 删除，统一使用 `tag::Tag`（标签数据由 tag crate 提供，core 只需知道 TagId）

#### 阶段三：整理归属（中期执行）

**4. core 作为 Domain 基础层应包含的类型：**

| 类型 | 来源 | 操作 |
|------|------|------|
| `CardId` | core（保留） | — |
| `TagId` | 新增 | type alias `String` |
| `Card` | core + parser 合并 | 上提 runtime 字段 |
| `FiveStageEntry` | parser/duel 提取 | 新增到 core |
| `CardMark` | core 重命名 | 原 `core::Mark` |
| `Zone` | core（保留） | — |
| `Stat` | core（保留） | — |
| `CoreError` | core（保留） | 扩展为统一错误类型 |
| `DamageType` | duel → core | 上提到 core |
| `PlayerSide` | duel → core | 上提到 core |

**5. 保留在各 crate 的独有类型（不动）：**

| Crate | 保留类型 | 理由 |
|-------|---------|------|
| parser | `Token`, `Lexer`, `CardAst`, `TagDef`, `ParseError`, `ParseResult`, `MetaInfo`, 数据治理类型 | 解析器专用 |
| duel | `Effect`, `EffectType`, `TriggerCondition`, `TargetSelector`, `DuelState`, `PlayerField`, `DuelPhase`, `DuelResult`, 场景类型 | 对峙引擎专用 |
| tag | `Tag`, `Mark`, `SkillEntry`, `TAGS/MARKS` 数据常量 | 标签系统专用 |
| devtools | `CheckResult`, `HealthReport`, `ErrorEntry` | 诊断工具专用 |

### 迁移成果预期

| 指标 | 迁移前 | 迁移后 |
|------|:---:|:---:|
| 重复 struct 定义 | 3 组 5 个 | 0 |
| 同名异义冲突 | 2 组（Tag, Mark） | 0 |
| core 被引用次数 | 0（无人依赖） | ≥3（parser/duel/tag 共同依赖） |
| 胶水层手动转换 | CardEntry 转换（lib.rs） | 0（直接传 `FiveStageEntry`） |

---

> **下步行动**: 实施 `architecture_refactor_plan.md` 阶段 0「类型统一」：创建统一的 `FiveStageEntry`，合并 `Card`，解决 Tag/Mark 命名冲突。
