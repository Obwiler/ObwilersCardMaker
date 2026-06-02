# ObwilerCardMaker — AI 规则

## 项目
Tauri v2 + React + TS + Rust 卡牌引擎。桌面 + Android。

## 架构
Rust 三层：`crates/core/` → `crates/engine/` → `crates/tools/`
依赖方向：tools → engine → core。禁止反向。
胶水层：`src-tauri/src/lib.rs`，唯一 Tauri 命令入口。

## 命令
| 操作 | 命令 |
|---|---|
| 开发 | `just dev` |
| 编译检查 | `just check` |
| 全量自检 | `just health` |
| 单元测试 | `just test-unit` |
| 格式化 | `just fmt` |
| Lint | `just lint` |
| 打包桌面 | `just build` |
| 打包 APK | `just build-apk` |

## 路径
- 环境激活：`F:/TOOLS/activate.ps1`
- 错题集：`error_log.json`（项目根）
- 卡牌数据：`app_data_dir/cards.json`

## 前端
- `pages/` — 页面组件 | `components/` — 通用组件
- `lib/tauri.ts` — Tauri 调用 | `types/` — TS 类型
- `stores/` — 状态管理

## 禁止
- core 引用 engine 层
- 绕过 justfile
- 胶水层写业务逻辑