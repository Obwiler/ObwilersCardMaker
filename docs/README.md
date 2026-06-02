# ObwilerCardMaker

> 《对峙》卡牌编辑器 — 基于 Tauri v2 + React 19 + TypeScript 的桌面卡牌设计工具。

## 版本索引

| 版本 | 日期 | 说明 |
|------|------|------|
| [0.8.5](./0.8.5) | 2026-05-29 | 卡面字体自定义（字体/字号/颜色） |
| [0.8.4](./0.8.4) | 2026-05-29 | 文档规范化 + 快捷方式规范落地 + 标题修正 |
| [0.8.3](./0.8.3) | 2026-05-29 | 技能持久化修复 + 版本号统一 |

## 快速开始

每个版本文件夹是独立完整的项目。进入版本目录后：

```bash
npm install
npm run tauri dev
```

或双击 `start-cardmaker.bat` 启动开发模式。构建产物在 `release\` 目录下，双击 `CardMaker_{版本号}.lnk` 直接运行。

## 项目结构

```
ObwilerCardMaker/
├── README.md              ← GitHub 主页
├── .gitignore
├── builds/0.8.3/                 ← 上一版本（完整独立）
├── builds/0.8.4/                 ← 前版本（完整独立）
├── builds/0.8.5/                 ← 当前版本（完整独立）
│   ├── 项目说明.md
│   ├── 开发标准.md
│   ├── 更新日志.md
│   ├── CardMaker_0.8.4.lnk
│   ├── src/
│   ├── src-tauri/
│   └── release/
└── {版本号}/              ← 下一版本
```

## 技术栈

Tauri v2 · React 19 · TypeScript 5.5 · Vite 6 · Zustand 5 · Ant Design 6 · Rust 1.96
