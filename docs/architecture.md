# ObwilerCardMaker 架构

## 技术栈
| 层 | 技术 |
|---|---|
| 桌面框架 | Tauri v2 |
| 前端 | React 18 + TypeScript + Vite |
| 后端 | Rust edition 2021 |
| 包管理 | pnpm + Cargo |
| 存储 | JSON (app_data_dir) |
| 命令入口 | justfile |

## 目录树
```
ObwilerCardMaker/
├── src/                        # 前端
│   ├── pages/                  # 页面组件 (HomePage, DevToolsPage, CardEditor)
│   ├── components/             # 通用组件
│   ├── lib/tauri.ts            # Tauri invoke 封装
│   ├── types/                  # TypeScript 类型定义
│   └── stores/                 # 状态管理
├── src-tauri/
│   ├── crates/
│   │   ├── core/               # 共享基础层
│   │   ├── engine/
│   │   │   ├── tag/            # 标签系统
│   │   │   ├── parser/         # 卡牌语法解析
│   │   │   ├── duel/           # 对战引擎
│   │   │   └── scenario/       # 场景定义（纯数据）
│   │   └── tools/
│   │       └── devtools/       # AI 自检诊断
│   ├── src/lib.rs              # 胶水层（Tauri 命令注册）
│   └── Cargo.toml              # Cargo workspace
├── docs/architecture.md        # 本文档
├── .ai/rules.md                # AI 上下文规则
├── justfile                    # 统一命令入口
└── error_log.json              # 错题集
```

## 6 模块职责

### core — 共享基础类型
| 文件 | 内容 |
|---|---|
| `card.rs` | `Card` / `CardId` / `Zone` / `Stat` |
| `tag.rs` | `Tag` / `Mark` |
| `error.rs` | `CoreError` 统一错误枚举 |

依赖：仅 serde/serde_json。不依赖任何 engine/tools 层。

### engine/tag — 标签系统
标签 CRUD、批量打标、查询。

依赖：core

### engine/parser — 语法解析
卡牌文本 → 结构化数据，含校验器。

依赖：core, tag

### engine/scenario — 场景定义（纯数据）
| 类型 | 用途 |
|---|---|
| `Scenario` | 对战配置（名称、人数、胜利条件、玩家列表） |
| `PlayerConfig` | 单玩家配置（名称、HP、卡组、初始手牌数） |
| `WinCondition` | 胜利条件（HP归零 / 卡组抽空 / 自定义） |

依赖：core。独立于 duel，可被 duel 和 parser 共同读取。

### engine/duel — 对战引擎
| 文件 | 内容 |
|---|---|
| `state.rs` | `DuelState` 状态机 / `PlayerState` / `GamePhase` / `PlayResult` |
| `scenario.rs` | 场景 JSON 加载/序列化 |
| `commands.rs` | 公开 API |

核心流程：`init_duel`（洗牌→抽牌）→ `next_turn`（End→抽牌→Main）→ `play_card`（手牌→场上→结算日志）

依赖：core, scenario

### tools/devtools — AI 自检诊断
8 项检查 + 错题集记录。

依赖：core

## 依赖流向
```
               tools/devtools
                    │
                    ▼
    engine/duel ──→ engine/scenario
                    │
    engine/tag ──→ engine/parser
         │              │
         └──────→ core ←──────┘
```
- core 为唯一基础层，禁止反向依赖
- scenario 独立于 duel，纯数据定义
- 所有 Tauri 命令在 src-tauri/lib.rs 统一注册

## 命令速查
| 命令 | 用途 |
|---|---|
| `just dev` | 启动 Tauri 开发模式 |
| `just check` | cargo check + tsc |
| `just health` | 8 项全量自检 |
| `just test-unit` | 运行 unit 测试 |
| `just build` | 打包桌面 EXE |
| `just build-apk` | 打包 Android APK |
