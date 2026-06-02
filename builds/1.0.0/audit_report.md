# ObwilerCardMaker 1.0.0 全面审计报告

> **审计日期**: 2026-06-01  
> **版本**: 1.0.0  
> **审计范围**: DevTools 自检诊断 / 架构复杂度分析 / 阶段1-5改动验证 / 数据加载排查

---

## 执行摘要

ObwilerCardMaker 1.0.0 是一个功能较为完整的桌面卡牌编辑器，基于 Tauri v2 + React 18 + Rust 构建。项目采用 Cargo workspace 管理 5 个独立 crate，前端 46 个源文件约 4500 行代码，后端约 4800 行 Rust 代码。

**核心发现**：

| 维度 | 评分 | 说明 |
|---|---|---|
| Rust 后端 | ⭐⭐⭐⭐ | 架构清晰、零循环依赖、模块解耦良好 |
| 前端 | ⭐⭐⭐⭐ | 组件齐全、状态管理规范、主题系统完整 |
| 测试覆盖 | ⭐⭐ | devtools 15/17、core 20/21, tag/parser/duel 覆盖率不足 |
| 数据治理 | ⭐⭐⭐ | Schema 校验/重复检测/导入导出已实现 |
| 构建 & 发布 | ⭐⭐⭐⭐ | EXE 10.63MB、构建脚本完整 |

**紧急问题**：数据加载 Bug 导致卡牌总数为 0（见第四章）。

---

## 一、DevTools 自检诊断

### 1.1 测试运行结果

| Crate | 测试数 | 通过 | 失败 | 状态 |
|---|---|---|---|---|
| devtools | 17 | 15 | 2 | ⚠️ |
| cardmaker-core | 21 | 20 | 1 | ⚠️ |
| tag | 0 | 0 | 0 | ⚠️ 无测试用例 |
| parser | — | — | — | ❌ 无 tests/ 目录 |
| duel | — | — | — | ❌ 无 tests/ 目录 |
| **合计** | **38** | **35** | **3** | — |

### 1.2 失败详情

| 测试 | Crate | 失败原因 |
|---|---|---|
| `test_append_and_read_error_log` | devtools | 错题集持久化：`assertion left=0, right=1` — 文件写入后有状态残留 |
| `test_error_summary_grouped` | devtools | 错题集分组：`assertion left=3, right=2` — 前一个测试的残留数据干扰 |
| `test_card_very_long_name` | core | 超长名称断言：期望 1000 实际 3000 — 长度限制逻辑不一致 |

**根因分析**：两个 devtools 失败是测试隔离性问题 — `clear_error_log()` 在测试间未完全隔离，导致前序测试的 `error_log.json` 文件干扰后续测试。建议使用 `tempfile` 或 per-test 临时目录。

### 1.3 健康检查命令

devtools crate 的 `full_report()` 函数包含 8 项检查：

1. `cargo check` — Rust 编译检查
2. `tsc --noEmit` — TypeScript 类型检查
3. `cargo test -p tag` — tag 单元测试
4. `cargo test -p parser` — parser 单元测试
5. `cargo test -p duel` — duel 单元测试
6. `cargo fmt --check` — Rust 代码格式化检查
7. `cargo clippy -- -D warnings` — Clippy 严格检查
8. `pnpm build` — 前端构建

**self_check 二进制**：已创建 `src-tauri/src/bin/self_check.rs`，调用 `devtools::full_report()` 并输出到 `builds/1.0.0/self_check_report.txt`。因 cargo 编译锁冲突，构建未完成，可稍后手动运行：

```powershell
cd src-tauri
cargo build --bin self_check
.\target\debug\self_check.exe
```

### 1.4 错题集系统

`error_log.json` 记录每次健康检查失败的条目，支持：
- `read_error_log()` — 读取全部记录
- `append_error_entry()` — 追加记录
- `clear_error_log()` — 清除记录（存在隔离 Bug）
- `error_summary()` — 按检查项分组统计

---

## 二、架构复杂度分析

### 2.1 Crate 依赖图

```
┌─────────────────────────────────────────────┐
│              cardmaker (lib.rs)              │
│         Tauri 胶水层 — 31 个命令            │
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
          │  core   │  (未被任何 crate 依赖)
          │  0.1.0  │
          └─────────┘
```

**关键特征**：
- **零 crate 间依赖**：tag / parser / duel / devtools / core 五者互不依赖，仅依赖 serde/serde_json
- **扁平架构**：所有集成在 lib.rs 胶水层完成，crate 各自独立
- **循环依赖**：无（扁平架构天然免疫）

### 2.2 代码规模统计

| 层级 | 模块 | 文件数 | 代码行数（不含空行/注释） |
|---|---|---|---|
| Rust | core | 4 | ~60 |
| Rust | tag | 3 | ~218 |
| Rust | parser | 6 | ~1,704 |
| Rust | duel | 5 | ~2,398 |
| Rust | devtools | 1 | ~159 |
| Rust | lib.rs + main.rs | 2 | ~293 |
| **Rust 合计** | | **21** | **~4,832** |
| | | | |
| 前端 | TSX 组件 | 26 | ~3,381 |
| 前端 | TS 类型/工具 | 14 | ~915 |
| 前端 | CSS | 1 | ~227 |
| **前端合计** | | **41** | **~4,523** |
| | | | |
| 数据 | cards.json | 1 | 78 张卡牌 |
| 配置 | schema/规则文档 | 6 | — |
| | | | |
| **总计** | | **69** | **~9,355 行** |

### 2.3 公开 API 统计

| Crate | pub fn | pub struct | pub enum | 说明 |
|---|---|---|---|---|
| tag | ~4 | ~2 | 0 | 标签查询 API |
| parser | ~20 | ~8 | 0 | 解析器 + CRUD + 数据治理 |
| duel | ~8 | ~10 | ~6 | 对峙引擎 + 状态机 |
| devtools | ~12 | ~4 | 0 | 健康检查 + 错题集 |
| core | ~2 | ~4 | ~1 | 共享基础类型 |
| **合计** | **~46** | **~28** | **~7** | |

### 2.4 前端组件树与数据流

```
App.tsx
├── Layout.tsx
│   ├── Sidebar.tsx          (标签索引、暗色切换)
│   └── [Page Content]
│       ├── HomePage.tsx      (统计面板 + 快速入口)
│       ├── TagsPage.tsx → TagPanel.tsx → TagCard.tsx
│       ├── CardsPage.tsx → CardPanel.tsx → CardItem.tsx + CardDetail.tsx
│       ├── EditorPage.tsx → CardEditor.tsx + CreateCardModal.tsx
│       ├── ParserPage.tsx → ParserPanel.tsx → ParseResult.tsx
│       ├── DuelPage.tsx → DuelPanel.tsx → DuelField.tsx + DuelLog.tsx
│       └── DevToolsPage.tsx
├── ErrorBoundary.tsx
└── StatsPanel.tsx

状态管理 (Zustand stores):
  cardStore.ts  → useCards hook → 卡牌 CRUD
  duelStore.ts  → useDuel hook  → 对峙状态
  parserStore.ts → useParser hook → 解析缓存
  undoStore.ts  → 撤销/重做
  themeStore.ts → 暗色/亮色切换

数据流方向: UI → invoke() → Tauri Command → Rust crate → cards.json
             UI ← Result<T> ← Tauri ← Rust ← cards.json
```

**Props 传递深度**：最深层级 3 层（Page → Panel → Item/Detail），状态主要通过 Zustand store 共享而非 props drilling。

### 2.5 前后端耦合度

| 指标 | 数值 |
|---|---|
| Tauri 命令总数 | **31** |
| 前端 invoke 封装数 | **31**（一一对应） |
| 命令分类 | Tag(4) / Parser CRUD(10) / 数据治理(4) / Duel(7) / DevTools(5) / 通用(1) |
| 耦合模式 | 薄胶水层 — lib.rs 仅做类型转换和路由 |

**评估**：耦合度低，前后端通过明确定义的 Tauri 命令接口通信，数据治理命令（validate_cards / detect_duplicates / export_cards / import_cards）已在前端 tauri.ts 封装。

---

## 三、各阶段改动验证矩阵

### 阶段 1：基础架构清理

| 检查项 | 预期 | 实际 | 状态 |
|---|---|---|---|
| engine/ 目录已删除 | 不存在 | 不存在（engine 不在 workspace members 中） | ✅ |
| rustfmt.toml | 项目根 | `src-tauri/rustfmt.toml` | ⚠️ 位置偏差 |
| clippy.toml | 项目根 | `src-tauri/clippy.toml` | ⚠️ 位置偏差 |
| .eslintrc.cjs | 项目根 | 存在（218B） | ✅ |
| .prettierrc | 项目根 | 存在 | ✅ |
| .github/workflows/ci.yml | 项目根 | 存在 | ✅ |

**说明**：rustfmt.toml / clippy.toml 放置于 `src-tauri/` 而非项目根。因为所有 cargo 命令从 `src-tauri/` 执行，该位置实际上正确生效，但通常约定放在 workspace 根目录。**功能无影响**。

### 阶段 2：测试覆盖

| 检查项 | 预期 | 实际 | 状态 |
|---|---|---|---|
| core 测试 | 存在 | 21 个测试，20/21 通过 | ✅⚠️ |
| tag 测试 | 存在 | tests/integration_test.rs 存在但无测试函数 | ❌ |
| parser 测试 | 存在 | 无 tests/ 目录 | ❌ |
| duel 测试 | 存在 | 无 tests/ 目录 | ❌ |
| devtools 测试 | 存在 | 17 个测试，15/17 通过 | ✅⚠️ |

**总览**：5 个 crate 中仅 2 个有实际测试用例。parser（1704 行）和 duel（2398 行）作为最大模块完全无测试。

### 阶段 3：数据治理

| 检查项 | 预期 | 实际 | 状态 |
|---|---|---|---|
| cards.schema.json | 存在且格式正确 | `data/cards.schema.json` — JSON Schema Draft-7，结构完整 | ✅ |
| validate_cards 函数 | card_data.rs | `data_gov.rs` — `validate_cards_json()` / `validate_current_cards()` | ✅ |
| detect_duplicates 函数 | card_data.rs | `data_gov.rs` — `detect_duplicates()` (name + text 哈希) | ✅ |
| export_cards 函数 | card_data.rs | `data_gov.rs` — `export_cards(ids)` 含 _export_meta | ✅ |
| import_cards 函数 | card_data.rs | `data_gov.rs` — `import_cards(json_str)` 含去重逻辑 | ✅ |
| data/backups/ 目录 | 存在 | **不存在** | ❌ |

**说明**：四个函数在 `data_gov.rs`（434 行）而非 `card_data.rs`，但 lib.rs 中 Tauri 命令已有包装且前端 invoke 已封装，功能完整。`data/backups/` 目录在首次写盘时由 `rotate_backups()` 自动创建 (`create_dir_all`)，实际功能正常。

### 阶段 4：UI 增强

| 检查项 | 预期 | 实际 | 状态 |
|---|---|---|---|
| src/ui/stores/ | 含 4 个 store | 5 个文件：cardStore / duelStore / parserStore / undoStore / **themeStore** | ✅ |
| theme.css 暗色模式 | 含 :root 和亮色覆盖 | `:root` 深色 + `:root[data-theme="light"]` 亮色，完整设计令牌 | ✅ |
| ErrorBoundary.tsx | 存在 | 2697 字节，含 fallback UI + 重试 | ✅ |
| useKeyboardShortcuts.ts | 存在 | 1717 字节 | ✅ |
| CardPanel.tsx — 搜索 | 存在 | ✅ 含 searchQuery 状态 | ✅ |
| CardPanel.tsx — 标签筛选 | 存在 | ✅ 含 activeTag 状态和标签过滤 | ✅ |
| CardPanel.tsx — 排序 | 存在 | ✅ sortBy / sortOrder | ✅ |
| CardPanel.tsx — 视图切换 | 存在 | ✅ grid / list 视图 | ✅ |
| CardPanel.tsx — 导入导出 | 存在 | ✅ Export/Import 按钮 | ✅ |

**说明**：stores 有 5 个而非 4 个，多了 `themeStore.ts`（暗色/亮色主题管理），属预期外扩展。

### 阶段 5：构建与发布

| 检查项 | 预期 | 实际 | 状态 |
|---|---|---|---|
| version.json | "1.0.0" | "1.0.0" (major:1 minor:0 patch:0) | ✅ |
| scripts/build.ps1 | 存在 | 存在，含 exe/apk/both 三目标 | ✅ |
| builds/1.0.0/ EXE | 存在且>0 | `ObwilerCardMaker_1.0.0_x64.exe` (10.63 MB) | ✅ |
| builds/1.0.0/ Setup | 存在 | `CardMaker_1.0.0_x64-setup.exe` (2.48 MB) | ✅ |
| EXE 版本嵌入 | "1.0.0" | FileVersion/ProductVersion 均为 "1.0.0" | ✅ |

### 验证矩阵总览

```
阶段1: ✅✅⚠️⚠️✅✅✅  (5/7 完全通过)
阶段2: ⚠️❌❌❌⚠️      (0/5 完全通过，2/5 部分通过)
阶段3: ✅✅✅✅✅❌    (5/6 通过)
阶段4: ✅✅✅✅✅✅✅✅✅ (9/9 通过)
阶段5: ✅✅✅✅✅      (5/5 通过)
```

---

## 四、数据加载问题根因分析

### 4.1 问题表现

用户截图显示"卡牌总数: 0"、"解析成功: 0"、"解析失败: 0"，而仪表盘"卡牌浏览"描述却提到"157 张卡牌"。前三项统计来自 Rust 后端真实数据，最后一项是前端硬编码文本。

### 4.2 根因定位

**三层数据不一致**：

| 位置 | 内容 | 卡牌数 |
|---|---|---|
| `data/cards.json`（项目源码） | 新格式，含 `_meta` + `cards` | **78** |
| `%APPDATA%\com.obwiler.cardmaker\cards.json`（运行时） | **`[]`（空数组）** | **0** |
| 前端硬编码 | HomePage.tsx 中的描述文本 | "157"（过时） |

**Bug 链路追踪**：

```
1. 程序启动 → lib.rs setup()
2. app_data_dir = %APPDATA%\com.obwiler.cardmaker\
3. init_cards(data_dir) 被调用
4. 检查: path.exists()? → YES（存在空数组 cards.json）
5. 读取文件 → 内容为 "[]"
6. 新格式解析失败（CardStore 无 cards 键）
7. 回退到旧格式解析：serde_json::from_str::<Vec<Card>>("[]") → Ok(vec![])
8. 结果: cards.len() = 0
9. 播种逻辑不触发（因为 path.exists() 为 true）
```

**核心 Bug**：`init_cards()` 函数中，只有 `!path.exists()` 时才触发播种。但 AppData 中已存在一个空的 `cards.json`，导致播种被跳过。空文件来源可能是：
- 之前某次运行中 `save_to_disk` 写入了空数组
- 或首次运行时 cards.json 被创建但内容为空

### 4.3 修复方案

**立即修复**（用户侧）：
```powershell
# 删除 AppData 中的空文件，触发重新播种
Remove-Item "$env:APPDATA\com.obwiler.cardmaker\cards.json"
Remove-Item "$env:APPDATA\com.obwiler.cardmaker\cards.json.bak"
# 重启应用即可自动播种
```

**代码修复**（开发者侧）：
```rust
// card_data.rs init_cards() 中增加空数据检测
if !path.exists() || path.metadata().map(|m| m.len() < 10).unwrap_or(true) {
    // 播种逻辑
    std::fs::write(&path, BUNDLED_CARDS_JSON)?;
    just_seeded = true;
}
```

### 4.4 连带问题

1. **前端硬编码**：HomePage.tsx 中"浏览 157 张卡牌"应改为动态读取
2. **_meta.version 为空**：`data/cards.json` 的 `_meta.version` 字段为空字符串，应为 "1.0.0"
3. **新格式迁移不完整**：`data/cards.json` 是 `{"cards":[...],"_meta":{...}}` 格式但 `_meta.version` 为空

---

## 五、未实装功能清单与优先级

| 功能 | 当前状态 | 优先级 | 说明 |
|---|---|---|---|
| parser crate 测试 | 无 tests/ | 🔴 高 | 1700 行代码零测试 |
| duel crate 测试 | 无 tests/ | 🔴 高 | 2400 行代码零测试 |
| tag crate 测试 | 有空壳文件 | 🟡 中 | integration_test.rs 存在但无测试函数 |
| devtools 测试隔离 | 2 个失败 | 🟡 中 | error_log.json 跨测试污染 |
| data/backups/ 预创建 | 懒创建 | 🟢 低 | 功能正常但目录不存在 |
| 数据加载空文件检测 | 缺失 | 🔴 高 | 导致 0 卡牌 Bug |
| 前端卡牌数量动态化 | 硬编码 "157" | 🟡 中 | 应与后端同步 |
| _meta.version 填充 | 为空字符串 | 🟡 中 | 应为 "1.0.0" |
| Android APK 构建 | 脚本支持但缺 SDK | 🟢 低 | build.ps1 含 apk 目标 |

---

## 六、总体评分

| 维度 | 评分 | 权重 | 加权 |
|---|---|---|---|
| 架构设计 | 8.5/10 | ×0.25 | 2.13 |
| 代码质量 | 7.5/10 | ×0.20 | 1.50 |
| 测试覆盖 | 4.0/10 | ×0.20 | 0.80 |
| 数据治理 | 7.0/10 | ×0.15 | 1.05 |
| 构建发布 | 8.0/10 | ×0.10 | 0.80 |
| 文档完整性 | 6.5/10 | ×0.10 | 0.65 |
| **总分** | | | **6.93/10** |

### 优势

1. **零循环依赖的扁平 crate 架构**—模块解耦设计优秀
2. **完整的前端组件树**—涵盖 7 页面、16 组件、5 store
3. **设计令牌主题系统**—深色/亮色双模式，CSS 变量体系
4. **原子写盘 + 自动备份**—card_data.rs 的数据安全性设计
5. **数据治理四件套**—Schema 校验/重复检测/导入导出均已实现

### 待改进

1. **parser/duel 完全无测试**—这两个 crate 占后端代码量 85%
2. **数据加载存在空文件盲区**—直接影响用户体验
3. **devtools 测试隔离性缺陷**—2 个测试因状态残留失败
4. **版本信息分散**—version.json(1.0.0)、_meta.version("")、card_data.rs(0.9.1) 不一致

---

*报告由 File Agent 自动生成，基于 2026-06-01 的项目状态。*
