# 版本号统一管理方案 v1.0

## 一、设计目标

消除 0.9.0 的版本碎片化问题：`package.json`、`Cargo.toml`、`tauri.conf.json`、前端界面、Windows 安装包元数据等各处版本号各自为政，导致"改了三处漏了一处，界面显示与实际版本不一致"。

**核心原则：单一真相源 → 自动同步 → 编译时校验**

## 二、消费者清单

| 消费者 | 路径 | 关键字段 | 作用域 |
|--------|------|---------|--------|
| 前端 npm | `package.json` | `version` | npm 包版本、前端 `pkg.version` 读取 |
| Rust 后端 | `src-tauri/Cargo.toml` | `package.version` | cargo 编译版号 |
| Tauri 配置 | `src-tauri/tauri.conf.json` | `version` | 窗口标题、安装包版本 |
| 前端界面 | `src/App.tsx` 或 `src/main.tsx` | 动态读取 | 界面中央版本展示 |
| 更新日志 | `更新日志.md` | 章节标题 | 对外文档 |
| Git tag | `.git` | tag `vX.Y.Z` | 版本追溯 |
| 安装包 | MSI 元数据 | 从 tauri.conf.json 派生 | Windows 安装包 |

## 三、统一方案

### 3.1 单一真相源

在项目根目录创建 `version.json`：

```json
{
  "version": "0.9.1",
  "major": 0,
  "minor": 9,
  "patch": 1,
  "label": ""
}
```

此文件是**唯一**允许手动修改的版本源。任何版本号变更只能通过编辑此文件完成。

### 3.2 自动同步脚本

`scripts/sync-version.mjs`（零依赖 Node.js 脚本）：

1. 读取 `version.json`
2. 同步 `package.json` → `version` 字段
3. 同步 `src-tauri/Cargo.toml` → `package.version`
4. 同步 `src-tauri/tauri.conf.json` → `version`
5. 同步 `更新日志.md` → 最新版本章节标题（需核对）

**编译前置钩子**：`npm run tauri build` 前通过 `beforeBuildCommand` 自动跑 `node scripts/sync-version.mjs`，确保编译产物版本号强制一致。

### 3.3 前端版本读取

`src/utils/version.ts`：

```ts
// 从 package.json 导入版本号（Vite 构建时静态内联）
import pkg from '../../package.json';
export const APP_VERSION = pkg.version;
```

所有前端显示统一从此文件导入，禁止直接 `import pkg from '../../package.json'`。

### 3.4 Git 标签

版本发布时，在 `sync-version.mjs` 中追加 `git tag v${version}` 的提示输出（不自动执行，需人工确认）。

## 四、版本号规范

遵循语义化版本 `MAJOR.MINOR.PATCH`：

| 变更类型 | 递增位 | 示例 |
|---------|--------|------|
| 语法重构、数据模型大改 | MAJOR | 无需，当前永远 0.x |
| 功能模块新增/重构 | MINOR | 0.9.0 → 0.9.1 |
| Bug 修复、小优化 | PATCH | 0.9.1 → 0.9.2 |

## 五、鲁棒性保障

1. **编译时断言**：`sync-version.mjs` 执行后立即校验所有消费者版本号是否一致，不一致则 `process.exit(1)` 阻止构建
2. **禁止手动修改消费者**：代码审查规则 — package.json / Cargo.toml / tauri.conf.json 的版本字段只允许通过 `sync-version.mjs` 修改
3. **二进制自检**：Rust 端在应用启动时打印 `env!("CARGO_PKG_VERSION")` 到控制台，与前端显示交叉验证

## 六、执行流程

```
开发中：
  version.json → [手动编辑] → node scripts/sync-version.mjs → 全部消费者更新

构建时：
  npm run tauri build
    → beforeBuildCommand: node scripts/sync-version.mjs [校验模式]
    → 校验通过 → tauri build → 产物带正确版本号
```
