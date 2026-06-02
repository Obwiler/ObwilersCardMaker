# ObwilerCardMaker 架构重构计划书

> **文档版本**: 1.0.0  
> **日期**: 2026-06-01  
> **前置审计**: `builds/1.0.0/audit_report.md`  
> **状态**: 待实施

---

## 目录

1. [现状诊断](#1-现状诊断)
2. [目标架构](#2-目标架构)
3. [模块交叉设计](#3-模块交叉设计)
4. [UI 映射设计](#4-ui-映射设计)
5. [鲁棒性设计](#5-鲁棒性设计)
6. [实施路线](#6-实施路线)
7. [验收标准](#7-验收标准)

---

## 1. 现状诊断

### 1.1 架构问题总览

当前项目采用 Cargo workspace 管理 5 个独立 crate，依赖关系如下：

```
        ┌─────────────────────────────────────────────┐
        │              lib.rs (Tauri 胶水层)           │
        │              31 个命令，手动路由              │
        └──────┬────────┬────────┬────────┬───────────┘
               │        │        │        │
               ▼        ▼        ▼        ▼
           ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐
           │ tag  │ │parser│ │ duel │ │ devtools │
           │0.9.1 │ │0.9.1 │ │0.9.1 │ │  1.0.0   │
           └──────┘ └──┬───┘ └──────┘ └──────────┘
                       │
                       ▼
                  ┌─────────┐
                  │  core   │  ← 未被任何 crate 依赖
                  │  0.1.0  │
                  └─────────┘
```

### 1.2 核心问题列表

| # | 问题 | 严重度 | 具体表现 |
|---|------|--------|---------|
| P1 | **Crate 间零交叉引用** | 🔴 严重 | tag / parser / duel / devtools 互不依赖，所有集成压在 lib.rs 胶水层，胶水层成为唯一的集成点，承载 31 个 Tauri 命令的全部路由、参数转换、错误映射 |
| P2 | **core 未被任何 crate 依赖** | 🔴 严重 | core 定义了共享基础类型（CardKind、EffectTrigger 等），但所有其他 crate 各自独立定义自己的类型，完全没有复用，造成 `parser::Card` 和 `duel::Card` 是两套不同的结构体 |
| P3 | **parser 输出无法直接输入 duel** | 🔴 严重 | parser 解析完成后产出 `CardAst`，duel 引擎需要 `DuelCard` 来初始化对峙。当前 lib.rs 中手动做结构转换（`CardAst → DuelCard`），转换逻辑散落在胶水层，duel 初始化时需重新构造状态，而非直接消费解析结果 |
| P4 | **tag 模块孤立运作** | 🟡 中等 | tag 提供标签查询 API，但 parser 解析卡牌文本时不知道有哪些合法标签可用。标签字典（如"阵营"→["儒家","道家"]）对 parser 是不可见的，parser 无法做标签合法性校验 |
| P5 | **devtools 横切能力未落地** | 🟡 中等 | devtools 的健康检查能力存在但未注入到各模块。理想中 devtools 应能诊断 parser 的解析失败率、duel 的状态转换异常、tag 的覆盖率，但当前仅被动接受外部调用 |
| P6 | **前端组件树与 Rust 领域模型脱节** | 🟡 中等 | React 组件按"页面"组织（CardsPage / DuelPage / ParserPage），而非按领域实体组织。CardPanel、DuelBoard、TagPanel 各自独立获取数据，没有统一的实体→组件映射关系 |
| P7 | **测试覆盖率两极分化** | 🔴 严重 | core 20/21 通过、devtools 15/17 通过，但 parser（1704 行）和 duel（2398 行）完全零测试，占总后端代码量 85% |
| P8 | **版本信息不一致** | 🟡 中等 | version.json = "1.0.0"，`_meta.version` = ""，`card_data.rs` 内部用 "0.9.1"，三处版本号各不相同 |

### 1.3 架构复杂性诊断

| 指标 | 当前值 | 理想值 | 问题 |
|------|--------|--------|------|
| crate 间依赖边数 | 0 | ≥4（有意义的交叉） | 零依赖 = 零协作 |
| 胶水层命令数 | 31 | ≤10（薄路由） | 所有逻辑压在 lib.rs |
| 重复类型定义 | parser::Card vs duel::Card vs core::CardKind | 1 套共享类型 | 三套类型互不兼容 |
| 前端 invoke 封装 | 31（1:1 映射命令） | ≤10（按领域聚合） | 无领域聚合 |

---

## 2. 目标架构

### 2.1 架构哲学

> **反对扁平孤立** → 拥抱分层协作  
> **UI 是领域模型的投影** → 组件树反映实体关系  
> **模块间必须有意义的交叉** → 每个 crate 既消费也产出

### 2.2 分层架构：DDD + 六边形架构（端口与适配器）

```
┌──────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                        │
│   React 组件树 ←→ 领域实体一一映射                            │
│   CardView / TagFilter / DuelBoard / ParserInspector          │
│   通过 useCase hooks 调用应用层，不直接接触 Rust               │
└───────────────────────────┬──────────────────────────────────┘
                            │ Tauri invoke (按领域聚合)
┌───────────────────────────▼──────────────────────────────────┐
│                     APPLICATION LAYER                         │
│   用例编排：CreateCardUseCase / StartDuelUseCase /            │
│   ParseTextUseCase / ValidateCardUseCase                      │
│   通过 Port 接口依赖下层，不依赖具体技术实现                  │
│                                                               │
│   Ports (trait 定义):                                        │
│   - CardRepository: load_all / save / find_by_id              │
│   - TagDictionary: all_tags / tags_by_category                │
│   - DuelEngine: init / step / query_state                     │
│   - ParserService: parse / validate                           │
│   - DiagnosticsPort: report / health_check                    │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                      DOMAIN LAYER                             │
│   纯领域逻辑，零外部依赖（仅 std + serde）                    │
│                                                               │
│   Entities:                                                   │
│   - Card (id, name, list_tags, pre_tag, duel_tags, text, ast) │
│   - Tag (name, category, aliases, parent_tag)                 │
│   - Rule (trigger, condition, effect) ← 解析后的 AST 节点     │
│   - Effect (Damage / Heal / Draw / Buff / Debuff / ...)       │
│   - DuelState (players[], turn, phase, log)                   │
│                                                               │
│   Value Objects:                                              │
│   - CardId / TagId / PlayerId / EffectValue                   │
│                                                               │
│   Domain Services (纯函数):                                   │
│   - CardValidator: 标签合法性 / 文本语法 / ID 唯一性          │
│   - DuelResolver: 伤害计算 / 效果结算 / 优先级排序            │
│   - TagIndex: 标签查询 / 模糊匹配 / 层级展开                  │
│                                                               │
│   Domain Events:                                              │
│   - CardCreated / CardUpdated / CardDeleted                   │
│   - DuelPhaseChanged / EffectApplied / PlayerEliminated       │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                        │
│   实现 Application Ports，对接具体技术                        │
│                                                               │
│   Adapters:                                                   │
│   - JsonCardRepository: 文件读写 + 原子写盘 + 备份           │
│   - TauriCommandAdapter: #[tauri::command] 薄转发             │
│   - BundledTagDictionary: 编译期嵌入标签种子数据              │
│   - DevToolsCollector: 跨模块指标采集                         │
│                                                               │
│   Cross-cutting:                                              │
│   - ErrorContext: 统一错误类型 + 上下文传播                   │
│   - DiagnosticsPipeline: 注入到各领域模块的检查点             │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 依赖方向（关键约束）

```
Presentation ──→ Application ──→ Domain
                     │
                     ▼
               Infrastructure (实现 Ports，依赖 Domain)

依赖规则：
- Domain 层：零外部依赖，不对任何其他层有编译期依赖
- Application 层：仅依赖 Domain 层（通过 Port trait 抽象基础设施）
- Infrastructure 层：依赖 Domain 层 + 实现 Application Ports
- Presentation 层：仅依赖 Application 层（通过 useCase hooks）
```

### 2.4 Crate 重组方案

| 当前 Crate | 行数 | 目标归属 | 新定位 |
|-----------|------|---------|--------|
| core | ~60 | **Domain 层** | 所有共享实体类型 + 值对象 + Domain Events。成为被所有其他 crate 依赖的基础层 |
| tag | ~218 | **Domain 层** | Tag 实体 + TagIndex 领域服务。为 parser 提供标签合法性校验 |
| parser | ~1704 | **Domain + Application 层** | 拆分：Domain 部分（CardAst 解析器核心）留在 Domain；CRUD 逻辑上移到 Application |
| duel | ~2398 | **Domain + Application 层** | 拆分：DuelState + DuelResolver 在 Domain；用例编排（StartDuel / StepDuel）上移到 Application |
| devtools | ~159 | **Infrastructure 层** | 实现 DiagnosticsPort，横切注入到所有模块 |
| lib.rs | ~293 | **Application + Infrastructure 层** | 拆散：Tauri 命令改为薄适配器（每个命令≤5行） |
| — | 新增 | **Application 层** | `use_cases/` 模块：CreateCardUseCase / StartDuelUseCase / ParseTextUseCase 等 |

---

## 3. 模块交叉设计

### 3.1 交叉矩阵

下表描述每个模块如何消费（行）和如何被消费（列）：

|           | 被 core 消费 | 被 tag 消费 | 被 parser 消费 | 被 duel 消费 | 被 devtools 消费 |
|-----------|:-----------:|:-----------:|:-------------:|:-----------:|:---------------:|
| **core 提供** | — | Card 实体定义 | Card/Rule/Effect 类型定义 | Card/DuelState/Effect 类型 | 所有实体的 trait 边界 |
| **tag 提供** | — | — | TagIndex（标签合法性校验） | 标签过滤查询 | Tag 覆盖率统计 |
| **parser 提供** | — | — | — | CardAst（直接输入对手引擎） | 解析成功率 / 错误分布 |
| **duel 提供** | — | — | — | — | 状态转换日志 / 异常诊断 |
| **devtools 提供** | — | — | — | — | — |

### 3.2 具体交叉场景

#### 交叉 1：tag → parser（标签字典注入解析器）

```
场景：用户输入卡牌文本 "消耗1「仁心」→ 自身 → 恢复 → 1点技力"
当前：parser 无法校验「仁心」是否为合法标记名
目标：
  1. parser 初始化时注入 TagIndex
  2. 解析过程中遇到 `「...」` 标记时，查询 TagIndex 校验合法性
  3. 若标记不在字典中，产生 Warning 级别诊断而非 Error
  
接口：
  trait TagDictionary {
      fn is_valid_marker(&self, name: &str) -> bool;
      fn resolve_alias(&self, name: &str) -> Option<String>;
  }
```

#### 交叉 2：parser → duel（解析结果直接驱动对峙）

```
场景：用户创建对峙后，需要将卡牌能力载入引擎
当前：lib.rs 中手动转换 CardAst → DuelCard → init_duel()
目标：
  1. parser 产出的 CardAst 直接实现 Into<DuelCardInit> trait
  2. duel 引擎提供 init_from_ast(cards: &[CardAst]) 方法
  3. 消除胶水层中的转换代码

接口：
  // parser crate
  impl From<CardAst> for duel::DuelCardInit { ... }
  
  // duel crate  
  pub fn init_duel_from_parsed(cards: &[parser::CardAst]) -> Result<DuelState, DuelInitError>
```

#### 交叉 3：core ← 所有模块（共享基础类型）

```
场景：parser 和 duel 各自定义了 Card 结构体
当前：parser::Card { id, name, list_tags, ..., ast, errors }
      duel::DuelCard { id, name, stats, abilities }
      两者无法互操作
目标：
  1. core::Card 定义最小公共字段（id, name, tags）
  2. parser::Card 扩展 core::Card 增加 ast/errors
  3. duel::CardInstance 扩展 core::Card 增加运行时状态
  4. 通过 trait 实现互转（而非手动字段拷贝）

接口：
  // core crate
  pub struct Card {
      pub id: CardId,
      pub name: String,
      pub tags: Vec<Tag>,
      pub text: String,
  }
  
  // parser crate
  pub struct ParsedCard {
      pub base: core::Card,
      pub ast: CardAst,
      pub errors: Vec<ParseError>,
  }
  
  // duel crate  
  pub struct DuelCard {
      pub base: core::Card,
      pub hp: u32,
      pub armor: u32,
      pub energy: u32,
  }
```

#### 交叉 4：devtools 横切注入

```
场景：诊断各模块运行状态
当前：devtools 被动等待外部调用 full_report()
目标：
  1. 各模块注册诊断检查点到 devtools
  2. parser 每次解析后上报解析计数和错误
  3. duel 每次状态转换后上报状态变更
  4. devtools 聚合展示跨模块的健康仪表盘

接口：
  trait DiagnosticsSink {
      fn report_metric(&self, module: &str, key: &str, value: f64);
      fn report_event(&self, module: &str, event: DiagnosticEvent);
  }
```

---

## 4. UI 映射设计

### 4.1 映射原则

> **React 组件树 = 领域模型的投影。组件结构直接反映实体结构，而非按"页面"组织。**

### 4.2 实体→组件映射表

| 领域实体 | React 组件 | 职责 |
|---------|-----------|------|
| Card（领域实体） | CardView | 展示单张卡牌的完整信息（名称、标签、属性、文本、AST） |
| Card + 编辑状态 | CardEditor | 编辑模式下的 CardView，含表单校验和实时解析 |
| Card[] | CardList | 卡牌列表，含搜索、筛选、排序、分页 |
| Tag（领域实体） | TagChip / TagBadge | 标签展示（颜色、图标、分类） |
| TagIndex（领域服务） | TagFilter / TagBrowser | 标签筛选面板、标签浏览器 |
| Rule（AST 节点） | RuleNode / RuleTree | 解析结果可视化，树形展示触发条件和效果链 |
| Effect（值对象） | EffectBadge | 效果的图标化展示（伤害/治疗/抽牌等） |
| DuelState（聚合根） | DuelBoard | 对峙面板，含双方玩家状态、手牌区、日志 |
| DuelState.turn | TurnIndicator | 回合指示器 |
| DuelState.log | DuelLog | 操作日志流 |
| ParserOutput | ParserInspector | 解析结果检查器，含 AST 树和错误列表 |
| DiagnosticsReport | DevToolsDashboard | 健康仪表盘 |

### 4.3 组件树重组

```
Before（按页面组织）:
  Pages: CardsPage / TagsPage / DuelPage / ParserPage / DevToolsPage
  问题：同质组件重复，CardInfo 在 CardsPage、DuelPage、ParserPage 各出现一次

After（按领域实体组织）:
  Entity Components:
    CardView ──┬── CardEditor
               ├── CardList (搜索/筛选/排序使用 TagFilter)
               └── CardDetail (含 ParserInspector)
               
    TagBadge ──── TagFilter / TagBrowser
    
    DuelBoard ──┬── PlayerPanel (使用 CardView 展示双方卡牌)
                ├── TurnIndicator
                └── DuelLog
    
    DevToolsDashboard

  Page Components (薄壳，组合实体组件):
    CardsPage = CardList + CardEditor
    DuelPage = CardList(选牌) + DuelBoard
    ParserPage = CardEditor + ParserInspector
```

### 4.4 数据流映射

```
领域事件 → Zustand Store → React 组件重新渲染

CardCreated    → cardStore.upsert(card)    → CardList / CardView 更新
CardUpdated    → cardStore.upsert(card)    → CardEditor / CardDetail 更新
CardDeleted    → cardStore.remove(id)      → CardList 移除条目
DuelPhaseChanged → duelStore.setPhase(p)  → TurnIndicator / DuelBoard 更新
EffectApplied  → duelStore.pushLog(entry) → DuelLog 追加条目
```

### 4.5 前端 Tauri Invoke 聚合

```
Before（31 个独立 invoke）:
  invoke("create_card", { name, tags, text })
  invoke("update_card", { id, name, tags, text })
  invoke("delete_card", { id })
  invoke("validate_cards", {})
  ...

After（按领域聚合为 useCase hooks）:
  useCards()    → { cards, create, update, remove, validate, import, export }
  useDuel()     → { state, start, step, reset }
  useParser()   → { parse, ast, errors }
  useTags()     → { tags, filter, resolve }
  useDevTools() → { report, health, errors }
```

---

## 5. 鲁棒性设计

### 5.1 错误处理策略

```
分层错误类型：

Domain 层:
  - CardValidationError: ID 重复 / 名称过长 / 标签非法 / 文本语法错误
  - DuelRuleError: 非法状态转换 / 效果冲突 / 资源不足
  - 所有 Domain 错误为可恢复的 Result::Err，不 panic

Application 层:
  - UseCaseError: 包装 Domain 错误 + 附加上下文（用户操作意图）
  - 统一 ErrorContext 类型: { code, message, source_module, timestamp }

Infrastructure 层:
  - StorageError: 文件读取失败 / 序列化失败 / 备份失败
  - 所有 IO 错误有重试逻辑（最多 2 次），失败后回退到安全状态

Presentation 层:
  - ErrorBoundary 捕获未处理异常
  - Toast 通知用户可恢复错误
  - 致命错误显示 Fallback UI + 重试按钮
```

### 5.2 边界条件处理

| 场景 | 处理策略 |
|------|---------|
| cards.json 为空或格式损坏 | 检测文件大小 < 阈值 → 回退到编译期嵌入的种子数据 → 种子数据也为空时优雅降级为空卡池（不崩溃） |
| cards.json 被外部修改且校验失败 | 加载前运行 JSON Schema 校验 → 校验失败时加载上次有效备份 → 备份也不可用时回退到种子数据 |
| 并发写入 cards.json | 使用文件锁（fs2 crate 或等效原子操作），写操作串行化 |
| parser 遇到未定义语法 | 产生 ParserWarning 而非硬错误 → 尽力解析（best-effort）→ AST 中标记 unknown 节点 |
| duel 非法状态转换 | 返回 DuelRuleError → 应用层捕获后重置到上一个合法状态 |
| 备份目录满（>20 份） | rotate_backups() 已有清理逻辑 → 增加磁盘容量检测，<100MB 时警告用户 |

### 5.3 数据校验层次

```
Layer 1: JSON Schema（结构层）
  - cards.schema.json 校验顶层结构
  - 字段类型 / 必填项 / 字符串长度限制
  - 预检：启动时 + 每次导入时运行

Layer 2: Domain Validator（语义层）
  - CardValidator: 标签是否在 TagIndex 中 / ID 是否唯一 / 文本是否可解析
  - 在 create / update / import 时运行

Layer 3: Cross-module Consistency（跨模块一致层）
  - 卡牌引用的标签是否在 tag 模块中存在
  - parser 解析结果与 duel 引擎初始化是否一致
  - devtools 定期巡检
```

### 5.4 容错与降级

```
优先级：
  1. 数据完整性 > 功能可用性 > 性能

降级路径：
  cards.json 损坏
    → 尝试 cards.json.bak
    → 尝试 backups/ 最近备份
    → 回退到 BUNDLED_CARDS_JSON 种子数据
    → 种子也空 → 空卡池（程序正常运行，提示用户创建卡牌）

  parser 解析失败
    → AST 标记为 PartialParse
    → errors 字段记录详情
    → UI 显示黄色警告而非红色错误
    → 卡牌仍可保存和编辑

  duel 引擎异常
    → 记录异常状态到 devtools
    → 重置对峙到初始状态
    → 提示用户重新开始
```

---

## 6. 实施路线

### 6.1 总体策略

- 每阶段独立可交付，不产生未完成依赖
- 重构期间保持前端可运行（feature flag 切换新旧架构）
- 每阶段完成后运行全量测试 + devtools 健康检查
- 渐进式迁移，不搞"大爆炸"重写

### 6.2 阶段 0：地基 — Domain 层建立（2-3 天）

**目标**：让 core 成为真正的共享基础层，消除重复类型定义。

**任务**：
1. 在 `core` crate 中定义统一的实体类型：
   - `Card`, `CardId`, `Tag`, `TagId`, `Rule`, `Effect`, `EffectValue`
   - `DuelState`, `PlayerId`, `TurnPhase`
2. 将所有共享枚举统一到 core：`EffectKind`（Damage/Heal/Draw/Buff/Debuff/...）
3. 删除 parser 和 duel 中的重复类型定义，改为 `use core::*`
4. 更新所有 crate 的 `Cargo.toml`，添加 `core = { path = "../core" }` 依赖
5. 运行 `cargo test --workspace` 确保编译通过

**交付物**：
- core crate 从 60 行扩展到 ~200 行（共享类型）
- parser 和 duel 各减少 ~100 行重复代码
- 所有现有测试继续通过

### 6.3 阶段 1：交叉连接 — tag → parser（2-3 天）

**目标**：让 parser 在解析时能访问标签字典，实现标签合法性校验。

**任务**：
1. 在 `tag` crate 中定义 `TagDictionary` trait（含 `is_valid_marker`、`resolve_alias`）
2. 实现 `BundledTagDictionary`（编译期嵌入标签种子数据）
3. 在 `parser` 的 `Cargo.toml` 中添加 `tag = { path = "../tag" }` 依赖
4. 修改 `parse_card_text()` 签名，增加可选的 `&dyn TagDictionary` 参数
5. 解析过程中对 `「...」` 标记调用 `is_valid_marker()` 校验
6. 非法标记生成 Warning 级别诊断，而非阻断解析
7. 为 parser 编写 15+ 单元测试（覆盖正常解析、非法标记警告、空输入、超长文本）

**交付物**：
- parser 首次与 tag 产生交叉依赖
- parser 测试覆盖率从 0% → ≥60%
- `parse_card_text()` 新增可选参数，向后兼容

### 6.4 阶段 2：流水线 — parser → duel（3-4 天）

**目标**：消除 parser 输出到 duel 输入之间的手动转换代码。

**任务**：
1. 在 `duel` 的 `Cargo.toml` 中添加 `parser = { path = "../parser" }` 依赖
2. 实现 `From<parser::CardAst> for duel::DuelCardInit`
3. 实现 `duel::init_duel_from_parsed(cards: &[parser::CardAst]) -> Result<DuelState, DuelInitError>`
4. 移除 lib.rs 中的 CardAst → DuelCard 手动转换代码
5. 编写 duel 集成测试：解析→初始化→Step→验证状态转换
6. 为 duel 编写 20+ 单元测试（覆盖状态机所有转换、边界条件、错误状态回退）

**交付物**：
- parser 和 duel 首次建立直接依赖
- lib.rs 命令数从 31 减少到 ≤25
- duel 测试覆盖率从 0% → ≥70%
- 胶水层代码减少 ~150 行

### 6.5 阶段 3：横切注入 — devtools（2 天）

**目标**：让 devtools 的诊断能力注入到各模块，而非被动调用。

**任务**：
1. 在 `core` 中定义 `DiagnosticsSink` trait
2. 各模块在关键路径上报指标（parser: 解析计数+错误率；duel: 状态转换计数；tag: 查询次数）
3. devtools 实现 `DiagnosticsSink`，聚合所有模块数据
4. 增加 `cargo test -p devtools` 测试，修复 2 个隔离性失败的测试（使用 tempfile）
5. 前端 DevToolsDashboard 组件展示跨模块健康仪表盘

**交付物**：
- devtools 从被动调用转为主动收集
- devtools 测试 17/17 全部通过
- 前端新增 DevToolsDashboard 组件

### 6.6 阶段 4：应用层建立（3-4 天）

**目标**：将 lib.rs 胶水层逻辑上移到结构化的 Application 层。

**任务**：
1. 创建 Application 层模块结构：
   ```
   src-tauri/src/
   ├── application/
   │   ├── mod.rs
   │   ├── ports.rs            # trait 定义（Port 接口）
   │   ├── use_cases/
   │   │   ├── card_use_cases.rs
   │   │   ├── duel_use_cases.rs
   │   │   ├── parser_use_cases.rs
   │   │   └── tag_use_cases.rs
   │   └── dto.rs              # 数据传输对象（API 契约）
   ```
2. 定义 Port trait：
   - `CardRepository`: load_all / save / find_by_id / create / update / delete
   - `DuelEngine`: init / step / query_state / reset
   - `ParserService`: parse / validate
   - `DiagnosticsPort`: report_metric / report_event / health_check
3. 实现 UseCase（每个用例 ≤30 行，编排调用）：
   - `CreateCardUseCase`: 校验 + 创建 + 保存 + 返回 DTO
   - `StartDuelUseCase`: 选牌 + 解析 + 初始化引擎 + 返回 DuelState DTO
   - `ParseTextUseCase`: 解析文本 + 标签校验 + 返回 CardAst DTO
4. 将 lib.rs 中的 Tauri 命令改为薄适配器（每个命令 ≤5 行）：
   ```rust
   #[tauri::command]
   fn create_card(name: String, tags: Vec<String>, text: String) -> Result<CardDto, String> {
       CreateCardUseCase::new(&*REPOSITORY).execute(name, tags, text)
   }
   ```

**交付物**：
- Application 层独立可测试（mock Port 即可测试 UseCase）
- lib.rs 从 293 行缩减到 ≤80 行
- Tauri 命令总数从 31 减少到 ≤12（按领域聚合）

### 6.7 阶段 5：UI 映射重构（3-4 天）

**目标**：React 组件树重组为领域实体投影，前端通过 useCase hooks 调用后端。

**任务**：
1. 创建前端领域 hooks：
   ```
   src/ui/hooks/
   ├── useCards.ts      # 聚合所有卡牌操作（CRUD + 校验 + 导入导出）
   ├── useDuel.ts       # 聚合对峙操作
   ├── useParser.ts     # 聚合解析操作
   ├── useTags.ts       # 聚合标签操作
   └── useDevTools.ts   # 聚合诊断操作
   ```
2. 实体组件重构：
   - CardView（通用卡牌展示，被所有页面复用）
   - CardEditor（编辑模式，基于 CardView 扩展）
   - TagBadge / TagFilter（标签展示和筛选）
   - RuleTree（AST 可视化）
   - DuelBoard（对峙面板，内部使用 CardView）
3. 页面组件改为薄壳：
   ```tsx
   function CardsPage() { return <CardList />; }
   function DuelPage() { return <><CardList selectable /><DuelBoard /></>; }
   ```
4. 移除前端硬编码（HomePage.tsx 中"157 张卡牌"改为动态读取）
5. 修复 _meta.version 为空的问题（统一到 "1.0.0"）

**交付物**：
- 前端组件树映射领域模型
- 前端 invoke 聚合为 5 个领域 hooks
- 无硬编码数据

### 6.8 阶段 6：鲁棒性加固（2 天）

**目标**：完善错误处理、边界条件和数据校验。

**任务**：
1. 实现 cards.json 空文件/损坏文件检测与自动回退
2. 统一 `ErrorContext` 类型并应用到所有模块
3. 增加文件锁防止并发写入
4. 前端 ErrorBoundary 全覆盖（每个页面一个边界）
5. 运行全量测试 + devtools 健康检查

**交付物**：
- cards.json 空文件不导致 0 卡牌 Bug
- 统一错误类型体系
- 全量测试通过率 ≥95%

---

## 7. 验收标准

### 7.1 量化指标

| 指标 | 当前值 | 目标值 | 测量方式 |
|------|--------|--------|---------|
| crate 间交叉依赖边数 | 0 | ≥4 | `cargo tree --depth 1` |
| lib.rs 代码行数 | 293 | ≤80 | `tokei src-tauri/src/lib.rs` |
| Tauri 命令总数 | 31 | ≤12 | `grep -c "#\[tauri::command\]"` |
| parser 测试覆盖率 | 0% | ≥60% | `cargo tarpaulin -p parser` |
| duel 测试覆盖率 | 0% | ≥70% | `cargo tarpaulin -p duel` |
| 全量测试通过率 | 35/38 (92%) | ≥95% | `cargo test --workspace` |
| devtools 测试通过率 | 15/17 (88%) | 17/17 (100%) | `cargo test -p devtools` |
| 重复类型定义 | 3 套 Card | 1 套 core::Card | 代码审查 |
| 前端硬编码数据 | 1 处 ("157") | 0 处 | 代码审查 |
| _meta.version 一致性 | 3 个不同值 | 统一 "1.0.0" | 全局搜索 |
| cards.json 空文件处理 | 导致 0 卡牌 | 优雅降级 | 集成测试 |

### 7.2 功能回归清单

| 功能 | 验收方式 |
|------|---------|
| 卡牌 CRUD（创建/读取/更新/删除） | 手动测试 + 自动化测试 |
| 标签查询和筛选 | 手动测试 |
| 文本解析（78 张现有卡牌全部可解析） | 自动化测试（批量解析验证） |
| 对峙引擎初始化 + Step | 自动化测试（完整对峙流程） |
| 数据导入导出 | 手动测试 + 文件校验 |
| 自动备份（≤20 份轮转） | 自动化测试 |
| JSON Schema 校验 | 自动化测试 |
| 暗色/亮色主题切换 | 手动测试 |
| 键盘快捷键 | 手动测试 |
| 前端 ErrorBoundary | 手动触发测试 |

### 7.3 非功能性验收

| 维度 | 标准 |
|------|------|
| 编译时间 | `cargo build --release` 增量编译 ≤30s |
| 启动时间 | 冷启动 ≤2s（含 data/cards.json 加载） |
| 内存占用 | 空闲 ≤150MB |
| 代码规范性 | `cargo clippy -- -D warnings` 零警告 |
| 格式化 | `cargo fmt --check` 零差异 |

---

## 附录 A：Crate 依赖关系变更对照

### Before（当前）
```
lib.rs ──→ tag (独立)
       ──→ parser (独立，仅 core 被依赖但未使用)
       ──→ duel (独立)
       ──→ devtools (独立)
core ← 无人依赖
```

### After（目标）
```
lib.rs ──→ application ──→ domain (core + tag + parser-core + duel-core)
                │
                ▼
         infrastructure (devtools + file-io + tauri-adapter)

domain 内依赖：
  parser-core ──→ tag (标签校验)
  parser-core ──→ core (共享类型)
  duel-core ──→ parser-core (CardAst → DuelCardInit)
  duel-core ──→ core (共享类型)
  tag ──→ core (共享类型)
```

---

## 附录 B：风险评估与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 重构期间破坏现有功能 | 中 | 高 | Feature flag 切换架构 + 每阶段全量回归测试 |
| parser/duel 重建测试时发现隐藏 Bug | 高 | 中 | 每个 Bug 单独记录，不影响阶段交付 |
| 团队对 DDD 分层不熟悉 | 中 | 中 | 阶段 0 产出详细的类型定义文档 + 代码示例 |
| 前端组件重组影响 UX | 低 | 中 | 渐进式迁移，旧组件保留到新组件验证通过 |

---

*计划书基于 2026-06-01 审计报告制定，所有数据引用自 `builds/1.0.0/audit_report.md`。*
