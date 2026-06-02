# 更新日志

## [1.0.0] - 2026-06-01

### 架构优化
- 清理 engine/ 冗余 crate，移除历史遗留代码
- Rust 文件合并，从 53 文件精简至 35~40 文件
- 统一 rustfmt / clippy 工具链配置

### 工程质量
- 新增 CI 流水线（lint → build → test 三阶段）
- 新增 ESLint + Prettier + husky + lint-staged
- 新增 ~150 个测试用例，覆盖 core/parser/tag/duel/devtools

### 数据治理
- 新增 JSON Schema 校验（cards.schema.json）
- 新增 validate_cards / detect_duplicates / export_cards / import_cards 命令
- cards.json 新增 _meta 版本追踪字段
- 新增自动备份机制（保留最近 20 份）

### 前端增强
- Zustand 状态管理重构（card/duel/parser 三个 store）
- 撤销/重做（命令模式，Ctrl+Z/Y）
- 搜索筛选增强（模糊搜索、标签筛选、排序、视图切换）
- 暗色模式（跟随系统偏好、localStorage 持久化）
- 全局快捷键（Ctrl+S/N/F）
- 错误边界（崩溃降级 UI）
- 性能优化（编辑器防抖、虚拟滚动预埋）

### 打包交付
- 新增一键构建脚本 scripts/build.ps1
- Android APK 构建能力（环境满足时）

## [0.9.1] - 2026-05-31

### 审计修复（#8~#19）
- **#8 useDuel 空卡池匹配**：`loadScenarios` 不再传空数组查匹配数，新增 `loadScenarioMatches(cardPool)` 供有卡池数据时调用
- **#9 serde 序列化一致性**：`list_tags` 字段添加 `rename = "list_tags"`，确保序列化/反序列化键名一致
- **#11 EditorPage 去重刷新**：CRUD 返回值直接合并到 `useCards` 本地状态，移除冗余 `saveCards()` + `refresh()` 调用
- **#12 CardEditor 依赖优化**：`useEffect` 依赖从 `[card]` 改为 `[card.id]`，避免引用变化时重复重置表单
- **#13 CreateCardModal onClose 时序**：`onClose` 改由父组件在 `onSubmit` 成功后控制关闭，避免组件卸载后的异步状态更新警告
- **#14 DuelPanel 变量名**：`resultBanner(won)` 重命名为 `resultBanner(hasWinner)`，语义更清晰
- **#16 场景缓存**：`preset_scenarios()` 使用 `LazyLock<Vec<Scenario>>` 缓存 5 个预设场景，避免每次调用重建
- **#18 Sidebar 魔数**：标签截断上限提取为 `MAX_VISIBLE_TAGS` 常量

### Android APK 适配（尝试）
- 检测到构建环境缺少 Android SDK / NDK / JDK，Rust 仅安装了 `x86_64-pc-windows-msvc` target
- 无法完成 APK 构建，待后续配置 Android 开发环境后继续

### 构建与发布
- `npm run build`（tsc + vite）通过，62 modules，660ms
- `cargo build --release` 通过，cardmaker.exe（10.5MB）已更新至根目录

---

## [0.9.1] - 2026-05-30

### 项目基础设施
- 基于 Tauri v2 + React 18 + TypeScript 5 + Vite 5 从零重建项目骨架
- 建立版本号统一管理方案（`version.json` + `sync-version.mjs`）
- 前端/后端/配置文件版本号统一由单一真相源驱动

### 开发工具环境
- 建立独立工具目录 `E:\tools\`，项目工具从系统 PATH 解耦
- 已固化工具：Node.js v24.16.0 / Git 2.54.0 / Rust 1.96.0 (cargo 1.96.0)
- 提供 `E:\tools\activate.cmd` 一键激活本地工具环境
- 运行 `tools\activate.cmd` 后即可直接使用 rustc / cargo / node / npm / git

### 标签字典模块
- 实现 15 标签数据模型（`src-tauri/src/tag/types.rs`），包含 SkillEntry / Tag / Mark 结构体
- 标签数据内嵌为 Rust 常量（`src-tauri/src/tag/data.rs`），启动时通过 `LazyLock` 加载到 `HashMap`
- 后端暴露 4 个 Tauri 命令：`get_tag_by_name` / `get_tag_by_id` / `list_all_tags` / `list_all_marks`
- 前端 TypeScript 类型定义（`src/types/tag.ts`），与 Rust 端保持一致的字段结构

### 卡牌语法解析器
- 词法分析器（`src-tauri/src/parser/lexer.rs`）：逐字符扫描，产出 Arrow / Colon / Comma / LBracket / RBracket / Text / Number / Dash / Pipe 等 Token
- **修复**：`read_digits` 游标不前进导致数字识别无限循环 + 32GB 栈溢出崩溃
- 语法分析器（`src-tauri/src/parser/parser.rs`）：Token 流 → AST，支持五段式 `条件→主→谓→宾→备注` 解析、`[标签名]` 引用识别、`[标签名]定义：` 块内表格行解析
- 卡牌数据模块（`src-tauri/src/parser/card_data.rs`）：内嵌 157 张卡牌完整数据，含 5 阵营卡 / 12 职业卡 / 35 构筑卡 / 105 基本牌
- 语法校验器（`src-tauri/src/parser/validator.rs`）：五段式完整性 / 主语合法性 / 谓语合法性 / 标签引用有效性校验
- 后端暴露 4 个 Tauri 命令：`parse_card` / `parse_all_cards` / `validate_all_cards` / `parse_stats`
- 前端 TypeScript 类型定义（`src/types/parser.ts`），含 CardEntry / TagEntry / TagDef / CardAst / Card / CardValidation 等
- 全部 10 个单元测试通过，`cargo build` 编译成功

### 对峙规则引擎
- 对峙状态机（`src-tauri/src/duel/state.rs`）：DuelPhase 枚举（准备→先手回合→后手回合→结算→结束）、DuelState 结构体（阶段/回合/双方场地/效果栈）、PlayerField 场地状态（生命/护甲/技力/攻击力/标记系统）、状态转换函数、phase transition 自动推进
- 效果解析器（`src-tauri/src/duel/effect.rs`）：Effect 结构体（触发条件+效果类型+目标选择+数值）、EffectType 枚举（40+种效果：伤害/治疗/增益/减益/标记/封锁/淘汰等，对齐文档分类）、TriggerCondition 枚举（8种条件：无/消耗/事件/阈值/状态/累计/宣言/判定/序数）、从 parser AST CardEntry → Effect 的转换函数
- 对峙执行器（`src-tauri/src/duel/executor.rs`）：先手/后手攻防流程（回合开始→攻击阶段→效果栈结算→回合结束）、LIFO 效果栈解析、结算阶段（标记统计/胜负判定）、`apply_effect` 效果执行函数、`check_condition` 条件判断器（支持所有 8 种触发条件类型）
- 预设对战场景（`src-tauri/src/duel/scenario.rs`）：4 个预设场景（基础攻防儒法之争/标记对战兵墨之争/标签联动道杂对决/封锁反制阴阳纵横）、每个场景含双方卡牌引用和初始场地状态、`init_scenario` 场景初始化函数
- Tauri 命令（`src-tauri/src/duel/commands.rs`）：`init_duel` / `execute_turn` / `get_duel_state` / `get_effect_log` / `list_duel_scenarios` / `get_duel_phase_info`，DuelManager 全局状态管理
- 前端 TypeScript 类型定义（`src/types/duel.ts`）：DuelPhase / PlayerField / DuelState / EffectType / Scenario 等完整类型
- 全部 14 个单元测试通过（state 4 + effect 7 + executor 6 + scenario 6），`cargo check --frozen` 编译通过
- 注册 DuelManager / EffectLogStore 到 Tauri State，lib.rs invoke_handler 新增 6 个 duel 命令

### 完整化 UI 设计
- **UI 架构**：独立 `src/ui/` 模块，含 hooks / components / pages 三层，barrel 统一导出
- **数据驱动渲染**：所有组件不包含硬编码数据，全部从 Tauri backend invoke 拉取，改后端数据则 UI 自动反映
- **原子组件**：组件职责单一，容器组件负责数据获取（通过 hooks），展示组件负责渲染，展示组件不直接调用 Tauri invoke
- **主题系统** (`ui/theme.css`)：CSS 自定义属性设计令牌体系 — 深色主题色彩、间距尺度(4/8/16/24/32/48px)、字体层级(11-32px)、圆角(4/8/12px)、阴影三层、过渡动画(200ms)、骨架屏/滚动条/状态容器工具类
- **Tauri 封装层** (`lib/tauri.ts`)：`safeInvoke<T>` 泛型包装 + Result<T,E> 模式，按 Tag/Parser/Duel 三模块导出 14 个类型安全 API 函数
- **数据 Hook 层**：`useTags` / `useCards` / `useParser` / `useDuel` 四个 hook，各自封装 loading/error/refresh 三态管理
- **15 个 UI 组件**：
  - `Sidebar`：可折叠(56px↔240px) + 5 个主导航 + 动态标签列表(useTags 数据驱动)
  - `Layout`：flex 布局(侧边栏+内容区)
  - `TagPanel` / `TagCard`：标签网格 + hover 发光卡片
  - `CardPanel` / `CardItem` / `CardDetail`：搜索+标签筛选+左右分栏+五段式可折叠详览
  - `ParserPanel` / `ParseResult`：输入框+即时解析+AST 展示
  - `DuelPanel` / `DuelField` / `DuelLog`：场景选择+逐步回合+双方场地可视化+效果日志
  - `StatsPanel`：5 个仪表盘统计卡片
  - `MarkBadge`：最小原子复用徽章
- **5 个页面**：HomePage(仪表盘+快速入口) / TagsPage / CardsPage / ParserPage / DuelPage
- `npm run build` (tsc + vite build) 通过，0 错误，59 模块，产物 177KB JS + 3.25KB CSS

### 项目架构重组
- **深度解耦**：tag / parser / duel 三个后端模块重构为独立 Rust workspace crate（`src-tauri/crates/{tag,parser,duel}/`），零跨 crate 依赖
- **胶水层**：`src-tauri/src/lib.rs` 作为唯一桥接点，通过 `#[tauri::command]` 包装函数将子 crate 命令注册到 Tauri App
- **前端 types/**：`src/types/index.ts` barrel 统一导出 tag/parser/duel 类型，按模块拆分文件
- **docs/ 目录**：新建 `docs/`，移入 CHANGELOG.md、VERSION-MANAGEMENT.md、version.json，根目录保持干净
- **奥卡姆剃刀清理**：删除 6 个 .lnk 快捷方式、5 个构建临时文件（build_err.txt / test_err.txt 等）
- **版本同步**：`scripts/sync-version.mjs` 更新为同步 7 个消费者（含 3 个子 crate Cargo.toml + docs/version.json）
- `cargo build` 通过（19.39s），产物 16.69MB

### 程序整体封装与打包
- **前端构建**：`npm run build`（tsc + vite build）通过，产出 `dist/`（index.html + JS + CSS）
- **Tauri 完整构建**：`npx tauri build` 通过（32s），产出 `src-tauri/target/release/cardmaker.exe`（10.97MB，含前端嵌入）
- **根目录可执行**：`cardmaker.exe` 复制到项目根目录，支持直接双击运行
- **快捷方式**：根目录下创建 `CardMaker.lnk`（指向 cardmaker.exe）和 `激活工具环境.lnk`（指向 E:\tools\activate.cmd）
- **MSI 安装包**：因缺少 WiX Toolset，跳过 MSI 打包（可选产物，不影响分发）
