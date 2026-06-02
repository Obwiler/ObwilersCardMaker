# CardMaker - 《对峙》卡牌编辑器

版本：v0.6.3 | 技术栈：Tauri v2 + React 19 + TypeScript + Rust

## 项目简介
CardMaker 是专为回合制卡牌策略对战游戏《对峙》设计的卡牌编辑器。提供原子化、可配置、高鲁棒性的卡牌编辑体验，支持 8 种卡牌类型、24 种原子效果、12 种条件模板和完整的目标选择系统。

## 快速开始
```bash
npm install
npm run dev        # 启动开发服务器
npm run tauri dev  # 启动 Tauri 桌面应用
```

## 技术架构
- 原子层 (atomic/): 枚举、接口、常量定义
- 模板层 (templates/): 24 效果 + 12 条件 + 8 消耗
- 目标系统 (target/): 24 种目标类型 + 12 过滤器 + 5 排序器
- 数据层 (store/): Zustand 状态管理 + 标记管理 + 配置管理
- 业务层 (utils/): 校验器 + 导出器 + 工具函数
- 应用层 (components/ + pages/): 四步向导编辑器

## 功能
- 8 种卡牌类型编辑
- 可视化技能配置（条件/消耗/效果三模块）
- 完整目标选择系统（26 种目标 + 12 个过滤器）
- 标记系统
- JSON/PNG 导出
- 配置驱动，所有参数可调

## 开发命令
```bash
npm run type-check   # TypeScript 类型检查
npm run lint         # ESLint
npm run test         # 单元测试
npm run build        # 生产构建
```
