# 《对峙》卡牌编辑器统合规划计划书

**版本**: v2.0  
**制定日期**: 2026-05-29  
**项目状态**: 核心架构完成，功能开发中  
**技术栈**: Tauri v2 + React 19 + TypeScript + Rust

---

## 目录

1. [项目概述](#一项目概述)
2. [核心设计原则](#二核心设计原则)
3. [整体架构设计](#三整体架构设计)
4. [功能模块规划](#四功能模块规划)
5. [数据系统设计](#五数据系统设计)
6. [UI/UX设计规范](#六 uiux 设计规范)
7. [质量保障体系](#七质量保障体系)
8. [开发里程碑](#八开发里程碑)
9. [团队与分工](#九团队与分工)
10. [风险管理](#十风险管理)
11. [附录](#十一附录)

---

## 一、项目概述

### 1.1 项目背景

《对峙》是一款复杂的卡牌对战游戏，需要一款强大的编辑器来创建和管理游戏卡牌。本编辑器旨在提供**原子化、可配置、高鲁棒性**的卡牌编辑体验，支持用户在游戏规则边界内进行无限制的自由组合。

### 1.2 项目目标

#### 核心目标
- ✅ 实现 100% 原子化的游戏规则系统
- ✅ 提供可视化、低门槛的卡牌编辑界面
- ✅ 确保系统在任何输入下都不会崩溃
- ✅ 支持用户自定义扩展（标记、效果、规则）
- ✅ 导出符合游戏客户端标准的数据格式

#### 技术指标
- TypeScript 严格模式，零 `any` 类型
- 单元测试覆盖率 ≥ 80%
- 构建包体积 ≤ 50MB
- 冷启动时间 ≤ 3 秒
- 支持 Windows/macOS/Linux 三平台

### 1.3 用户群体

| 用户类型 | 需求特征 | 使用场景 |
|---------|---------|---------|
| 游戏设计师 | 快速原型设计，规则验证 | 设计新卡牌、测试平衡性 |
| 模组开发者 | 自定义扩展，数据导出 | 创建模组、分享卡牌 |
| 普通玩家 | 简单易用，可视化编辑 | 创建个性化卡牌 |
| 测试人员 | 批量生成，数据校验 | 压力测试、边界测试 |

### 1.4 竞品分析

| 产品 | 优势 | 劣势 | 我们的差异化 |
|-----|------|------|------------|
| Hearthstone Deck Tracker | 用户基数大，功能成熟 | 封闭系统，不可扩展 | 完全开放，支持自定义 |
| Magic: The Gathering Arena | 官方支持，数据准确 | 仅限官方卡牌 | 支持任意规则扩展 |
| 游戏王决斗链接 | 移动端体验好 | 功能简化 | 桌面端专业工具 |

---

## 二、核心设计原则

### 2.1 鲁棒性第一原则（不可动摇）

**定义**: 任何用户输入（包括空值、非法值、极端值）都不能导致程序崩溃、白屏或数据丢失。

**实施要求**:
1. **零崩溃承诺**
   - 所有异步操作必须添加 try-catch
   - 所有同步操作必须添加错误边界
   - 错误发生时显示友好提示，不中断用户体验

2. **容错优先**
   - 非法输入使用默认值降级
   - 空值处理返回空数组而非抛出错误
   - 单个组件错误不影响整体系统

3. **防御性编程**
   - 所有函数入口必须校验参数
   - 所有外部数据必须经过 sanitization
   - 禁止直接修改状态对象

4. **错误隔离**
   - 使用 React Error Boundary 包裹组件
   - 模块间错误不传递
   - 错误日志完整记录

**验收标准**:
- [ ] 输入任意非法数据，程序不崩溃
- [ ] 断开网络连接，程序正常降级
- [ ] 内存不足时，优雅提示而非闪退
- [ ] 所有错误都有中文友好提示

### 2.2 原子化脱耦合原则

**定义**: 将所有游戏规则拆解为不可再分的最小操作单元（原子），彻底消除硬编码和强耦合。

**实施要求**:
1. **最小原子单元**
   - 效果系统：24 个原子效果模板
   - 条件系统：12 个原子条件模板
   - 消耗系统：8 个原子消耗模板
   - 目标系统：24 种目标类型 + 12 个过滤器 + 5 个排序器

2. **无硬编码规则**
   - 属性上限可配置
   - 卡牌数量限制可配置
   - 标记类型可自定义
   - 效果模板可扩展

3. **单向依赖**
   ```
   应用层 → 业务层 → 模板层 → 数据层 → 原子层
   ```
   - 下层不知道上层的存在
   - 同层模块不相互依赖

4. **接口隔离**
   - 每个模块只暴露必要接口
   - 隐藏内部实现细节
   - 使用 TypeScript 接口定义契约

**验收标准**:
- [ ] 代码搜索无硬编码数值（除默认值）
- [ ] 依赖图呈现清晰单向箭头
- [ ] 添加新效果无需修改核心代码
- [ ] 每个原子单元可独立测试

### 2.3 可配置性原则

**定义**: 程序的行为由配置文件决定，而非代码逻辑。所有游戏参数、规则、限制都必须是可配置的。

**实施要求**:
1. **一切皆可配置**
   - 游戏参数（属性上限、卡组大小等）
   - 规则限制（技能数量、冷却范围等）
   - 视觉样式（卡牌尺寸、颜色等）
   - 导出格式（分辨率、文件格式等）

2. **配置驱动**
   - 配置文件集中管理
   - 支持运行时修改配置
   - 配置变更自动生效

3. **用户可扩展**
   - 提供配置编辑器 UI
   - 支持配置导入导出
   - 提供配置模板

4. **版本兼容**
   - 配置文件包含版本号
   - 系统兼容旧版本配置
   - 提供配置迁移工具

**验收标准**:
- [ ] 修改配置文件即可调整游戏规则
- [ ] 用户可创建自定义标记
- [ ] 支持配置一键恢复默认
- [ ] 配置错误有明确提示

### 2.4 标准化原则

**定义**: 所有数据遵循统一的 JSON Schema，所有代码遵循统一的规范。

**实施要求**:
1. **统一数据格式**
   - 所有数据实现 `IBase` 接口（id, version, createdAt, updatedAt）
   - 导出的卡牌数据符合游戏客户端标准
   - 使用 JSON Schema 验证数据合法性

2. **统一命名规范**
   - 变量、函数：小驼峰（camelCase）
   - 接口、类型、枚举：大驼峰（PascalCase）
   - 常量：全大写 + 下划线（UPPER_SNAKE_CASE）
   - 文件：短横线（kebab-case）

3. **统一错误处理**
   - 错误码格式：`ERR_{MODULE}_{CODE}`
   - 错误信息格式：`[模块] 错误描述`
   - 所有错误记录到统一日志系统

4. **统一导出格式**
   - 卡牌数据包含所有必要字段
   - 支持 JSON 格式导出
   - 支持批量导出

**验收标准**:
- [ ] 所有代码通过 ESLint 检查
- [ ] 导出的数据可直接被游戏客户端使用
- [ ] 错误信息清晰明确
- [ ] 文档齐全且更新及时

---

## 三、整体架构设计

### 3.1 架构分层（严格单向依赖）

```
┌─────────────────────────────────────────┐
│ 应用层 (Application Layer)              │
│  - UI 组件 (components/)                │
│  - 页面 (pages/)                        │
│  - 用户交互逻辑                         │
│  依赖：业务层、数据层、原子层           │
├─────────────────────────────────────────┤
│ 业务层 (Business Layer)                 │
│  - 编辑逻辑                             │
│  - 校验逻辑                             │
│  - 导出逻辑                             │
│  - 工具函数 (utils/)                    │
│  依赖：模板层、数据层、原子层           │
├─────────────────────────────────────────┤
│ 模板层 (Template Layer)                 │
│  - 效果模板 (templates/effects/)        │
│  - 条件模板 (templates/conditions/)     │
│  - 消耗模板 (templates/costs/)          │
│  - 目标选择系统 (target/)               │
│  依赖：原子层                           │
├─────────────────────────────────────────┤
│ 数据层 (Data Layer)                     │
│  - 状态管理 (store/)                    │
│  - 配置管理                             │
│  - 预设数据 (data/)                     │
│  - 标记管理器                           │
│  依赖：原子层                           │
├─────────────────────────────────────────┤
│ 原子层 (Atomic Layer)                   │
│  - 枚举定义 (atomic/enums.ts)           │
│  - 接口定义 (atomic/interfaces.ts)      │
│  - 常量定义 (atomic/constants.ts)       │
│  依赖：无                               │
└─────────────────────────────────────────┘
```

### 3.2 技术栈选型

#### 前端技术
| 技术 | 版本 | 用途 | 选型理由 |
|-----|------|------|---------|
| React | 19.x | UI 框架 | 并发渲染，性能优秀 |
| TypeScript | 5.x | 类型系统 | 类型安全，智能提示 |
| Ant Design | 6.x | UI 组件库 | 组件丰富，设计规范 |
| Zustand | 5.x | 状态管理 | 轻量简洁，易于调试 |
| Vite | 6.x | 构建工具 | 快速启动，热更新 |

#### 后端技术
| 技术 | 版本 | 用途 | 选型理由 |
|-----|------|------|---------|
| Tauri | 2.x | 桌面框架 | 包体积小，安全性高 |
| Rust | 1.75+ | 系统编程 | 性能卓越，内存安全 |

#### 开发工具
| 工具 | 用途 |
|-----|------|
| ESLint | 代码质量检查 |
| Prettier | 代码格式化 |
| Vitest | 单元测试 |
| Playwright | E2E 测试 |

### 3.3 目录结构规范

```
CardMaker/
├── src/                           # 源代码目录
│   ├── atomic/                    # 原子层
│   │   ├── enums.ts               # 枚举定义
│   │   ├── constants.ts           # 常量定义
│   │   ├── interfaces.ts          # 接口定义
│   │   └── index.ts               # 统一导出
│   │
│   ├── templates/                 # 模板层
│   │   ├── effects/               # 24 个效果模板
│   │   ├── conditions/            # 12 个条件模板
│   │   ├── costs/                 # 8 个消耗模板
│   │   └── index.ts               # 统一导出
│   │
│   ├── target/                    # 目标选择系统
│   │   ├── types.ts               # 类型定义
│   │   ├── TargetSelector.ts      # 选择器核心
│   │   ├── TargetTypeResolver.ts  # 类型解析器
│   │   ├── TargetFilterChain.ts   # 过滤器链
│   │   ├── TargetSorter.ts        # 排序器
│   │   ├── filters/               # 12 个过滤器实现
│   │   ├── sorters/               # 5 个排序器实现
│   │   ├── components/            # UI 组件
│   │   └── index.ts               # 统一导出
│   │
│   ├── store/                     # 数据层
│   │   ├── cardStore.ts           # 卡牌状态
│   │   ├── markManager.ts         # 标记管理器
│   │   ├── configManager.ts       # 配置管理器
│   │   └── index.ts               # 统一导出
│   │
│   ├── utils/                     # 业务层工具
│   │   ├── helpers.ts             # 通用工具
│   │   ├── validators.ts          # 校验工具
│   │   └── exporters.ts           # 导出工具
│   │
│   ├── components/                # 应用层组件
│   │   ├── CardPreview.tsx        # 卡牌预览
│   │   ├── ErrorBoundary.tsx      # 错误边界
│   │   └── index.ts               # 统一导出
│   │
│   ├── pages/                     # 应用层页面
│   │   ├── Step1_CardType.tsx     # 选择卡牌类型
│   │   ├── Step2_BasicInfo.tsx    # 填写基本信息
│   │   ├── Step3_EffectEdit.tsx   # 配置技能效果
│   │   └── Step4_Export.tsx       # 预览与导出
│   │
│   ├── data/                      # 配置数据
│   │   ├── marks/                 # 标记定义预设
│   │   ├── validation-rules.json  # 校验规则
│   │   └── config-defaults.json   # 默认配置
│   │
│   ├── App.tsx                    # 主应用入口
│   ├── main.tsx                   # React 入口
│   └── index.css                  # 全局样式
│
├── src-tauri/                     # Tauri 后端
│   ├── src/
│   │   └── main.rs                # Rust 入口
│   ├── Cargo.toml                 # Rust 依赖
│   ├── build.rs                   # 构建脚本
│   └── tauri.conf.json            # Tauri 配置
│
├── public/                        # 静态资源
│   ├── icons/                     # 应用图标
│   └── images/                    # 图片资源
│
├── docs/                          # 项目文档
│   ├── ARCHITECTURE.md            # 架构设计
│   ├── API.md                     # API 文档
│   └── USER_GUIDE.md              # 用户指南
│
├── tests/                         # 测试文件
│   ├── unit/                      # 单元测试
│   ├── integration/               # 集成测试
│   └── e2e/                       # E2E 测试
│
├── package.json                   # npm 配置
├── tsconfig.json                  # TypeScript 配置
├── vite.config.ts                 # Vite 配置
├── README.md                      # 项目说明
└── MIGRATION_GUIDE.md             # 迁移指南
```

### 3.4 模块依赖规则

**强制规则**:
1. 原子层不能依赖任何其他层
2. 模板层只能依赖原子层
3. 数据层只能依赖原子层
4. 业务层只能依赖模板层、数据层、原子层
5. 应用层只能依赖业务层、数据层、原子层
6. 同层模块之间不能相互依赖

**验证方法**:
- 使用 `madge` 工具生成依赖图
- CI/CD 流程中包含依赖检查
- 违反规则的代码禁止合并

---

## 四、功能模块规划

### 4.1 核心编辑流程（四步向导）

#### Step 1: 选择卡牌类型
**功能描述**: 用户选择要创建的卡牌类型。

**支持类型**:
| 类型 ID | 名称 | 特征 |
|--------|------|------|
| `basic` | 基本牌 | 有品质系统，固定 1 个技能 |
| `camp` | 阵营牌 | 无品质，支持冷却和使用次数 |
| `career` | 职业牌 | 无品质，支持冷却和使用次数 |
| `build_weapon` | 兵刃 | 无品质，支持冷却和使用次数 |
| `build_treasure` | 宝器 | 无品质，支持冷却和使用次数 |
| `build_armor` | 甲胄 | 无品质，支持冷却和使用次数 |
| `build_martial` | 武学 | 无品质，支持冷却和使用次数 |
| `build_spell` | 术法 | 无品质，支持冷却和使用次数 |

**UI 要求**:
- 卡片式布局，8 种类型平铺展示
- 选中状态有明显视觉反馈
- 每种类型显示名称和简短描述
- 支持键盘快捷键选择（1-8）

**交互流程**:
1. 用户点击卡牌类型卡片
2. 系统自动创建默认卡牌数据
3. 基本牌自动添加 1 个默认技能
4. 点击"下一步"进入 Step 2

**验收标准**:
- [ ] 8 种类型都能正常选择
- [ ] 选中状态有明显边框高亮
- [ ] 基本牌自动添加技能
- [ ] 非基本牌初始无技能

#### Step 2: 填写基本信息
**功能描述**: 用户填写卡牌的基本属性。

**基本牌字段**:
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|--------|------|
| name | string | 是 | "" | 卡牌名称 |
| type | enum | 是 | "basic" | 卡牌类型 |
| rarity | enum | 是 | "white" | 品质（白/蓝/紫/橙） |
| tags | string[] | 否 | [] | 标签列表 |
| mutuallyExclusive | string[] | 否 | [] | 互斥卡牌 ID |
| baseStats | object | 否 | {} | 基础属性 |

**非基本牌字段**:
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|--------|------|
| name | string | 是 | "" | 卡牌名称 |
| type | enum | 是 | 上一步选择的类型 | 卡牌类型 |
| coolDown | number | 否 | 0 | 冷却回合 |
| useLimit | number | 否 | 0 | 使用次数（0=无限） |
| tags | string[] | 否 | [] | 标签列表 |

**UI 要求**:
- 表单式布局，字段垂直排列
- 必填字段有红色星号标记
- 实时校验，错误提示在字段下方
- 品质选择使用带颜色的下拉框

**校验规则**:
- 名称长度：1-50 字符
- 冷却范围：0-99
- 使用次数：0-99
- 属性值：0-上限（可配置）

**验收标准**:
- [ ] 必填字段未填时禁止下一步
- [ ] 输入非法值时显示错误提示
- [ ] 基本牌显示品质选择
- [ ] 非基本牌显示冷却和次数

#### Step 3: 配置技能效果
**功能描述**: 用户配置卡牌的技能，包括条件、消耗、效果。

**核心功能**:
1. **技能管理**
   - 添加技能（基本牌限 1 个）
   - 删除技能
   - 重命名技能
   - 切换编辑技能

2. **三模块编辑**
   - **条件模块**: 配置触发条件
   - **消耗模块**: 配置使用消耗
   - **效果模块**: 配置实际效果

3. **目标选择系统**
   - 24 种基础目标类型
   - 12 个过滤器
   - 5 个排序器
   - 承接主体系统

4. **参数配置**
   - 数值输入（带范围校验）
   - 下拉选择（标记、属性等）
   - 逻辑关系选择（AND/OR/NOT）

**UI 要求**:
- 技能列表在顶部，可折叠
- 三模块使用折叠面板分组
- 每个模块支持添加多个实例
- 实时显示生成的效果描述
- 承接主体自动传递

**交互流程**:
1. 点击"添加技能"
2. 输入技能名称
3. 在条件/消耗/效果模块添加实例
4. 配置每个实例的参数
5. 实时查看效果描述
6. 点击"下一步"进入 Step 4

**验收标准**:
- [ ] 基本牌只能有 1 个技能
- [ ] 非基本牌可添加多个技能
- [ ] 每个模块都能正常添加/删除
- [ ] 效果描述实时生成
- [ ] 承接主体正确传递

#### Step 4: 预览与导出
**功能描述**: 预览卡牌效果，导出为 PNG 图片或 JSON 数据。

**预览功能**:
- 实时显示卡牌外观
- 严格遵循视觉规范（360x500px，圆角 16px）
- 显示所有技能的效果描述
- 品质背景色和文字色正确

**导出功能**:
1. **导出 PNG**
   - 分辨率：1080x1500（3 倍）
   - 格式：PNG
   - 包含透明背景
   - 文件名：卡牌名称.png

2. **导出 JSON**
   - 符合游戏客户端标准
   - 包含所有必要字段
   - 包含自定义标记定义
   - 文件名：卡牌 ID.json

**UI 要求**:
- 左侧显示卡牌预览
- 右侧显示导出选项
- 导出按钮有明显视觉反馈
- 支持批量导出

**验收标准**:
- [ ] 预览与配置实时同步
- [ ] PNG 导出清晰无锯齿
- [ ] JSON 数据格式正确
- [ ] 支持一键复制 JSON 到剪贴板

### 4.2 标记系统

#### 4.2.1 内置标记（预设，用户可修改）

| 标记 ID | 名称 | 类型 | 叠加上限 | 持续时间 | 描述 |
|--------|------|------|---------|---------|------|
| `mark_renxin` | 仁心 | positive | 99 | 0 | 儒家核心标记 |
| `mark_fengbao` | 锋爆 | positive | 99 | 0 | 兵家核心标记 |
| `mark_jianyi` | 坚毅 | positive | 10 | 3 | 增加护甲 |
| `mark_xuruo` | 虚弱 | negative | 5 | 2 | 减少攻击 |

#### 4.2.2 自定义标记功能

**功能描述**: 用户可以创建完全自定义的标记。

**可配置属性**:
| 属性 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| name | string | 是 | 标记内部名称 |
| displayName | string | 是 | 显示名称 |
| description | string | 是 | 描述文本 |
| icon | string | 否 | 图标路径/base64 |
| type | enum | 是 | positive/negative/neutral |
| maxStack | number | 是 | 叠加上限（0=无上限） |
| duration | number | 是 | 持续回合（0=永久） |
| stackingType | enum | 是 | replace/add_value/add_percent/add_count |
| expireBehavior | enum | 是 | remove_all/remove_one/persist |

**生命周期钩子**:
- `onAdd`: 添加时触发的效果
- `onRemove`: 移除时触发的效果
- `onStackChange`: 堆叠数变化时触发的效果
- `onExpire`: 到期时触发的效果

**UI 要求**:
- 标记列表展示所有可用标记
- 支持搜索和筛选
- 标记编辑器支持可视化配置
- 图标支持上传和预览

**验收标准**:
- [ ] 用户可以创建任意数量的自定义标记
- [ ] 自定义标记出现在所有下拉框中
- [ ] 自定义标记随卡牌数据一起导出
- [ ] 支持导入导出标记配置

#### 4.2.3 标记管理器

**功能模块**:
1. **MarkDefinitionManager**
   - 管理所有标记定义
   - 提供增删改查接口
   - 支持导入导出

2. **MarkInstanceManager**
   - 管理游戏运行时标记实例
   - 处理标记生命周期
   - 触发钩子效果

**API 设计**:
```typescript
// 标记定义管理
MarkDefinitionManager.getAllMarks(): IMarkDefinition[]
MarkDefinitionManager.getMarkById(id: string): IMarkDefinition | undefined
MarkDefinitionManager.addCustomMark(mark: IMarkDefinition): void
MarkDefinitionManager.updateCustomMark(mark: IMarkDefinition): boolean
MarkDefinitionManager.deleteCustomMark(id: string): boolean
MarkDefinitionManager.exportCustomMarks(): string
MarkDefinitionManager.importCustomMarks(json: string): void

// 标记实例管理
MarkInstanceManager.addMark(targetId: string, mark: IMarkDefinition, stack: number, sourceId?: string): void
MarkInstanceManager.removeMark(targetId: string, markId: string, stack: number): boolean
MarkInstanceManager.removeAllMarks(targetId: string, type?: string): void
MarkInstanceManager.getMarks(targetId: string): IMarkInstance[]
MarkInstanceManager.hasMark(targetId: string, markId: string): boolean
MarkInstanceManager.getMarkStack(targetId: string, markId: string): number
```

### 4.3 目标选择系统

#### 4.3.1 基础目标类型（24 种）

**单目标（7 种）**:
- `SELF` - 自己
- `ONE_ENEMY` - 任意一名敌方
- `ONE_ALLY` - 任意一名友方
- `ONE_UNIT` - 任意一名单位
- `DAMAGE_SOURCE` - 伤害来源
- `TRIGGER_UNIT` - 触发者
- `INHERIT` - 承接主体

**多目标（5 种）**:
- `ALL_ENEMIES` - 所有敌方
- `ALL_ALLIES` - 所有友方
- `ALL_UNITS` - 所有单位
- `ALL_ALIVE` - 所有存活单位
- `ALL_DEAD` - 所有阵亡单位

**位置相关（5 种）**:
- `ADJACENT` - 所有接壤单位
- `ADJACENT_ENEMY` - 所有接壤敌方
- `ADJACENT_ALLY` - 所有接壤友方
- `LEFT_ADJACENT` - 左侧接壤单位
- `RIGHT_ADJACENT` - 右侧接壤单位

**特殊（7 种）**:
- `RANDOM_ENEMY` - 随机一名敌方
- `RANDOM_ALLY` - 随机一名友方
- `RANDOM_UNIT` - 随机一名单位
- `LOWEST_LIFE` - 生命最低的单位
- `HIGHEST_LIFE` - 生命最高的单位
- `LOWEST_ARMOR` - 护甲最低的单位
- `HIGHEST_ARMOR` - 护甲最高的单位
- `LOWEST_ENERGY` - 技力最低的单位
- `HIGHEST_ENERGY` - 技力最高的单位

#### 4.3.2 目标过滤器（12 个）

| 过滤器 ID | 功能 | 必填参数 |
|----------|------|----------|
| `filter_by_attribute` | 按属性过滤 | attribute, operator, value |
| `filter_by_mark` | 按标记过滤 | mark, operator, count |
| `filter_by_card_count` | 按手牌数量过滤 | operator, count |
| `filter_by_card_type` | 按手牌类型过滤 | cardType, operator, count |
| `filter_by_relation` | 按关系过滤 | relation |
| `filter_by_distance` | 按距离过滤 | operator, distance |
| `filter_by_alive` | 按存活状态过滤 | isAlive |
| `filter_by_equipped` | 按装备状态过滤 | equipmentType |
| `filter_by_buff` | 按增益状态过滤 | buffType |
| `filter_by_debuff` | 按减益状态过滤 | debuffType |
| `filter_exclude_self` | 排除自己 | 无 |
| `filter_exclude_target` | 排除指定目标 | targetId |

**逻辑关系**:
- `AND`: 与上一个过滤器取交集
- `OR`: 与上一个过滤器取并集
- `NOT`: 从结果中排除

#### 4.3.3 目标排序器（5 个）

| 排序器 ID | 功能 | 参数 |
|----------|------|------|
| `sort_by_attribute` | 按属性排序 | attribute, order(asc/desc) |
| `sort_by_mark` | 按标记排序 | mark, order(asc/desc) |
| `sort_by_distance` | 按距离排序 | order(asc/desc) |
| `sort_by_random` | 随机排序 | 无 |
| `sort_by_player_order` | 按行动顺序排序 | order(asc/desc) |

#### 4.3.4 承接主体系统

**工作流程**:
1. **条件阶段**: 条件选择目标并设置 `saveAsInherit: "key_name"`
2. **保存**: 系统将目标保存到 `context.inheritedTargets.key_name`
3. **效果阶段**: 效果使用 `type: "inherit"` 和 `inheritKey: "key_name"`
4. **获取**: 系统从承接主体中获取目标

**链式承接**:
- 效果也可以保存自己的目标
- 后续效果可以使用
- 支持多级链式传递

**UI 组件**:
```tsx
<TargetSelectorUI
  value={targetConfig}
  onChange={setTargetConfig}
  availableMarks={[...]}
  inheritKeys={["main_target", "secondary_target"]}
/>
```

**验收标准**:
- [ ] 24 种目标类型都能正常工作
- [ ] 12 个过滤器可自由组合
- [ ] 5 个排序器正确排序
- [ ] 承接主体正确传递
- [ ] 空目标池返回空数组

### 4.4 规则校验系统

#### 4.4.1 多层级校验架构

```
游戏级校验 → 卡组级校验 → 卡牌级校验 → 技能级校验 → 原子级校验
```

#### 4.4.2 校验规则清单

**游戏级校验**:
- [ ] 阵营数量限制（最多 3 个不同阵营）
- [ ] 职业搭配限制
- [ ] 总费用限制

**卡组级校验**:
- [ ] 卡组总数限制（默认 30 张）
- [ ] 单卡数量上限（默认 2 张）
- [ ] 品质分布限制

**卡牌级校验**:
- [ ] 属性上限校验（生命≤16，护甲≤12，能量≤10）
- [ ] 名称唯一性校验
- [ ] 技能数量限制（≤5 个）
- [ ] 标签数量限制（≤10 个）

**技能级校验**:
- [ ] 冷却时间范围（0-99）
- [ ] 使用次数范围（0-99）
- [ ] 条件/消耗/效果数量限制

**原子级校验**:
- [ ] 目标类型合法性
- [ ] 过滤器 ID 合法性
- [ ] 排序器 ID 合法性
- [ ] 参数完整性校验
- [ ] 承接主体存在性

#### 4.4.3 校验规则配置

**数据结构**:
```json
{
  "id": "rule_attribute_max",
  "name": "属性上限校验",
  "description": "检查属性值是否超过上限",
  "level": "error",
  "condition": "card.baseStats[attribute] > CONFIG.max_attribute_values[attribute]",
  "errorMessage": "{attribute}不能超过{max}，当前为{value}"
}
```

**校验结果**:
```typescript
interface IValidationResult {
  success: boolean;
  errors: Array<{
    ruleId: string;
    level: "error" | "warning" | "info";
    message: string;
  }>;
  warnings: Array<{
    ruleId: string;
    level: "error" | "warning" | "info";
    message: string;
  }>;
}
```

**UI 展示**:
- 错误用红色显示，禁止下一步
- 警告用黄色显示，可跳过
- 提示用蓝色显示，仅提供信息

**验收标准**:
- [ ] 所有校验规则可配置
- [ ] 校验失败有明确错误提示
- [ ] 支持一键修复部分错误
- [ ] 校验结果可导出

### 4.5 配置管理系统

#### 4.5.1 可配置项清单

**游戏参数**:
- `max_deck_size`: 卡组大小上限（默认 30）
- `max_card_count`: 单卡数量上限（默认 2）
- `max_attribute_values`: 属性上限配置
  - `life`: 16
  - `armor`: 12
  - `energy`: 10
- `min_cooldown`: 最小冷却（默认 0）
- `max_cooldown`: 最大冷却（默认 99）
- `default_mark_max_stack`: 标记默认叠加上限（默认 99）
- `default_mark_duration`: 标记默认持续时间（默认 0）

**视觉参数**:
- `card_width`: 卡牌宽度（默认 360）
- `card_height`: 卡牌高度（默认 500）
- `card_border_radius`: 圆角（默认 16）
- `export_scale`: 导出倍率（默认 3）

**导出参数**:
- `export_format`: 导出格式（JSON/PNG）
- `export_quality`: PNG 质量（默认 1.0）
- `export_path`: 默认导出路径

#### 4.5.2 配置管理器 API

```typescript
// 获取配置
ConfigManager.get(key: string): any
ConfigManager.getAttributeMax(attribute: string): number
ConfigManager.getMaxDeckSize(): number
ConfigManager.getCooldownRange(): { min: number; max: number }

// 设置配置
ConfigManager.set(key: string, value: any): void

// 批量操作
ConfigManager.getAll(): Record<string, any>
ConfigManager.reset(): void
ConfigManager.exportConfigs(): string
ConfigManager.importConfigs(json: string): void
```

#### 4.5.3 配置编辑器 UI

**功能**:
- 表格形式展示所有配置项
- 支持搜索和筛选
- 数值类型使用 InputNumber
- 字符串类型使用 Input
- 枚举类型使用 Select
- 修改后实时生效
- 支持一键恢复默认

**验收标准**:
- [ ] 所有配置项都可编辑
- [ ] 修改后实时生效
- [ ] 支持配置导入导出
- [ ] 非法值有校验提示

### 4.6 数据持久化

#### 4.6.1 存储策略

**本地存储**:
- 使用 Tauri FS API 存储到本地文件系统
- 用户数据目录：`{appData}/CardMaker/`
- 自动保存草稿（每 30 秒）
- 手动保存（Ctrl+S）

**数据分类**:
1. **卡牌数据**: `cards/{card_id}.json`
2. **卡组数据**: `decks/{deck_id}.json`
3. **自定义标记**: `marks/{mark_id}.json`
4. **配置数据**: `config/settings.json`
5. **草稿数据**: `drafts/{timestamp}.json`

#### 4.6.2 数据格式标准

**卡牌数据**:
```json
{
  "id": "card_long_sword",
  "version": "1.0",
  "createdAt": 1748563200000,
  "updatedAt": 1748563200000,
  "name": "long_sword",
  "displayName": "长剑",
  "type": "build_weapon",
  "rarity": "white",
  "skills": [...],
  "tags": ["兵刃", "物理伤害"],
  "mutuallyExclusive": [],
  "baseStats": {
    "life": 0,
    "armor": 0,
    "energy": 0,
    "attack": 1
  },
  "maxCount": 2,
  "priority": 80,
  "description": "物理伤害 +1",
  "flavorText": "普通的铁剑，却是战场上最可靠的伙伴",
  "customMarks": [...]
}
```

**版本管理**:
- 所有数据包含 `version` 字段
- 系统支持版本迁移
- 旧版本数据自动升级

#### 4.6.3 导入导出功能

**导入功能**:
- 支持拖拽文件到窗口
- 支持批量导入
- 导入时校验数据格式
- 冲突处理（跳过/覆盖/重命名）

**导出功能**:
- 导出为 JSON 文件
- 导出为 PNG 图片
- 批量导出（文件夹）
- 导出日志记录

**验收标准**:
- [ ] 支持导入旧版本数据
- [ ] 导入时自动校验
- [ ] 导出格式符合标准
- [ ] 批量操作有进度条

---

## 五、数据系统设计

### 5.1 核心接口定义

#### 5.1.1 基础接口

```typescript
interface IBase {
  id: string;                    // 唯一标识
  version: string;               // 版本号
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
}
```

#### 5.1.2 参数定义接口

```typescript
interface IParamDefinition {
  key: string;                   // 参数键
  label: string;                 // 显示标签
  type: "number" | "string" | "select" | "boolean" | "mark" | "attribute";
  options?: any[];               // select 类型选项
  min?: number;                  // number 类型最小值
  max?: number;                  // number 类型最大值
  default: any;                  // 默认值
  required: boolean;             // 是否必填
}
```

#### 5.1.3 原子效果接口

```typescript
interface IAtomicEffect extends IBase {
  type: string;                  // 效果类型唯一标识
  name: string;                  // 显示名称
  description: string;           // 描述文本
  params: IParamDefinition[];    // 参数定义列表
}
```

#### 5.1.4 效果实例接口

```typescript
interface IEffectInstance {
  effectId: string;              // 效果模板 ID
  params: Record<string, any>;   // 参数值
  condition?: IConditionInstance; // 触发条件
  timing: Timing;                // 时机
  stacking: StackingType;        // 叠加方式
  target: TargetType;            // 目标类型
  inheritTarget?: string;        // 承接主体
  limit?: {                      // 限制条件
    type: "per_turn" | "per_big_turn" | "per_game" | "per_use";
    count: number;
  };
}
```

#### 5.1.5 标记定义接口

```typescript
interface IMarkDefinition extends IBase {
  name: string;                  // 内部名称
  displayName: string;           // 显示名称
  description: string;           // 描述文本
  icon: string;                  // 图标路径/base64
  type: "positive" | "negative" | "neutral";
  maxStack: number;              // 叠加上限（0=无上限）
  duration: number;              // 持续回合（0=永久）
  stackingType: StackingType;    // 叠加方式
  expireBehavior: MarkExpireBehavior; // 过期行为
  onAdd?: IEffectInstance[];     // 添加时效果
  onRemove?: IEffectInstance[];  // 移除时效果
  onStackChange?: IEffectInstance[]; // 变化时效果
  onExpire?: IEffectInstance[];  // 到期时效果
}
```

#### 5.1.6 技能接口

```typescript
interface ISkill extends IBase {
  name: string;                  // 技能名称
  description: string;           // 技能描述
  conditions: IConditionInstance[]; // 条件列表
  costs: ICostInstance[];        // 消耗列表
  effects: IEffectInstance[];    // 效果列表
  cooldown: number;              // 冷却时间
  useLimit: number;              // 使用次数（0=无限）
  isPassive: boolean;            // 是否被动技能
}
```

#### 5.1.7 卡牌接口

```typescript
interface ICard extends IBase {
  name: string;                  // 内部名称
  displayName: string;           // 显示名称
  type: string;                  // 卡牌类型
  subType?: string;              // 子类型
  rarity: string;                // 品质
  skills: ISkill[];              // 技能列表
  tags: string[];                // 标签列表
  mutuallyExclusive: string[];   // 互斥卡牌 ID
  baseStats: Record<AttributeType, number>; // 基础属性
  maxCount: number;              // 单卡组数量上限
  priority: number;              // 结算优先级
  description: string;           // 描述文本
  flavorText?: string;           // 风味文本
  customMarks?: IMarkDefinition[]; // 使用的自定义标记
}
```

### 5.2 枚举定义

#### 5.2.1 属性类型

```typescript
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
```

#### 5.2.2 时机枚举

```typescript
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
  UNKNOWN = "immediate"
}
```

#### 5.2.3 叠加类型

```typescript
enum StackingType {
  REPLACE = "replace",
  ADD_VALUE = "add_value",
  ADD_PERCENT = "add_percent",
  ADD_COUNT = "add_count",
  UNKNOWN = "replace"
}
```

#### 5.2.4 逻辑运算符

```typescript
enum LogicOperator {
  AND = "AND",
  OR = "OR",
  NOT = "NOT",
  UNKNOWN = "AND"
}
```

#### 5.2.5 比较运算符

```typescript
enum ComparisonOperator {
  LT = "<",
  LTE = "<=",
  EQ = "=",
  GTE = ">=",
  GT = ">",
  NEQ = "!=",
  UNKNOWN = "="
}
```

### 5.3 数据流转

```
用户输入 → 表单组件 → Zustand Store → 校验器 → 数据层存储
                                             ↓
                                        原子层类型约束
                                             ↓
                                        模板层规则约束
                                             ↓
                                        导出为 JSON/PNG
```

**状态更新流程**:
1. 用户在表单输入
2. 表单组件调用 Zustand action
3. Action 校验数据合法性
4. 更新 Store
5. 触发 UI 重新渲染
6. 自动保存到本地

**数据导出流程**:
1. 用户点击导出
2. 从 Store 读取卡牌数据
3. 校验数据完整性
4. 序列化 JSON
5. 调用 Tauri FS API 保存
6. 显示成功提示

---

## 六、UI/UX 设计规范

### 6.1 视觉设计规范

#### 6.1.1 色彩系统

**主色调**:
- 主色：`#1677ff` (Ant Design Blue)
- 成功：`#52c41a`
- 警告：`#faad14`
- 错误：`#ff4d4f`

**品质颜色**:
- 白色（普通）：`#f5f5f5` 背景，`#000000` 文字
- 蓝色（稀有）：`#e6f7ff` 背景，`#0050b3` 文字
- 紫色（史诗）：`#f9f0ff` 背景，`#531dab` 文字
- 橙色（传说）：`#fff7e6` 背景，`#d46b08` 文字

**卡牌边框**:
- 白色：`#d9d9d9`
- 蓝色：`#91d5ff`
- 紫色：`#d3adf7`
- 橙色：`#ffd591`

#### 6.1.2 字体规范

**字体家族**:
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", 
             "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
```

**字号规范**:
- 标题：20px / 18px / 16px
- 正文：14px
- 辅助文字：12px
- 小字：10px

**字重规范**:
- 常规：400
- 中等：500
- 加粗：600 / 700

#### 6.1.3 间距规范

**基础单位**: 4px

**间距等级**:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px

#### 6.1.4 圆角规范

**圆角等级**:
- 小：4px
- 中：8px
- 大：12px / 16px
- 完全圆角：9999px

**卡牌圆角**: 16px

### 6.2 交互设计规范

#### 6.2.1 反馈原则

**即时反馈**:
- 点击按钮有按压效果
- 悬停有视觉变化
- 加载有进度提示
- 操作成功有提示

**错误反馈**:
- 表单校验错误在字段下方显示
- 系统错误使用 Alert 组件
- 网络错误提示重试
- 所有错误都有中文描述

#### 6.2.2 导航规范

**步骤导航**:
- 使用 Ant Design Steps 组件
- 显示当前步骤和进度
- 支持返回上一步
- 最后一步前禁止跳过

**面包屑导航**:
- 显示当前位置
- 支持点击跳转
- 层级不超过 3 级

#### 6.2.3 快捷键规范

**全局快捷键**:
- `Ctrl+S`: 保存
- `Ctrl+Z`: 撤销
- `Ctrl+Y`: 重做
- `Ctrl+N`: 新建卡牌
- `F1`: 帮助

**步骤导航快捷键**:
- `Alt+→`: 下一步
- `Alt+←`: 上一步
- `1-8`: 选择卡牌类型（Step 1）

### 6.3 响应式设计

#### 6.3.1 断点定义

```css
/* 移动端 */
@media (max-width: 576px) { }

/* 平板 */
@media (min-width: 577px) and (max-width: 992px) { }

/* 桌面 */
@media (min-width: 993px) { }
```

#### 6.3.2 布局策略

**桌面端（≥993px）**:
- 左侧编辑区，右侧预览区
- 完整功能展示
- 多列布局

**平板端（577px-992px）**:
- 单列布局
- 预览区折叠，点击展开
- 简化部分功能

**移动端（≤576px）**:
- 单列布局
- 预览单独页面
- 仅保留核心功能

### 6.4 无障碍设计

#### 6.4.1 键盘可访问性

- 所有交互元素可通过 Tab 键访问
- 支持 Enter/Space 激活按钮
- 支持方向键选择
- 焦点有明显视觉反馈

#### 6.4.2 屏幕阅读器支持

- 所有图片有 alt 文本
- 表单字段有 label
- 错误信息有 aria-describedby
- 状态变化有 aria-live

#### 6.4.3 色彩对比度

- 文字与背景对比度 ≥ 4.5:1
- 大文字对比度 ≥ 3:1
- 不使用纯色彩传达信息

---

## 七、质量保障体系

### 7.1 代码质量

#### 7.1.1 TypeScript 规范

**强制要求**:
- 启用严格模式（`strict: true`）
- 禁止使用 `any` 类型，使用 `unknown` 代替
- 所有变量和函数必须有明确类型注解
- 禁止使用类型断言（除非绝对必要）
- 所有接口必须继承 `IBase`

**代码检查**:
```bash
npm run type-check  # TypeScript 检查
npm run lint        # ESLint 检查
```

#### 7.1.2 代码风格

**格式化工具**: Prettier

**配置**:
```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "none"
}
```

**检查命令**:
```bash
npm run format:check
npm run format:write
```

#### 7.1.3 代码审查清单

**合并前检查**:
- [ ] TypeScript 类型检查通过
- [ ] ESLint 无错误
- [ ] 单元测试通过
- [ ] 功能手动测试通过
- [ ] 代码符合架构分层
- [ ] 无硬编码规则
- [ ] 错误处理完整
- [ ] 文档已更新

### 7.2 测试策略

#### 7.2.1 测试金字塔

```
        E2E 测试 (10%)
       /            \
      /              \
     / 集成测试 (20%) \
    /                  \
   /____________________\
  单元测试 (70%)
```

#### 7.2.2 单元测试

**测试框架**: Vitest

**覆盖范围**:
- 原子层枚举和接口
- 工具函数
- 管理器类（MarkManager, ConfigManager）
- 校验器
- 目标选择器

**示例**:
```typescript
describe('TargetSelector', () => {
  it('应该正确选择所有敌方单位', () => {
    const selector = new TargetSelector();
    const config: ITargetConfig = {
      type: TargetType.ALL_ENEMIES,
      filters: [],
      limit: 0
    };
    const context = createMockContext();
    const targets = selector.select(config, context);
    expect(targets.every(t => t.isEnemy)).toBe(true);
  });
});
```

**覆盖率要求**: ≥ 80%

#### 7.2.3 集成测试

**测试范围**:
- 模块间接口
- 数据流转
- 状态管理
- API 调用

**示例场景**:
- 创建卡牌 → 保存 → 读取 → 修改 → 导出
- 添加标记 → 使用标记 → 移除标记
- 配置校验 → 显示错误 → 修复 → 通过

#### 7.2.4 E2E 测试

**测试框架**: Playwright

**测试场景**:
1. 完整编辑流程（4 个步骤）
2. 保存和加载
3. 导入和导出
4. 配置修改
5. 错误处理

**示例**:
```typescript
test('完整的卡牌创建流程', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="card-type-basic"]');
  await page.click('[data-testid="next-step"]');
  await page.fill('[data-testid="card-name"]', '测试卡牌');
  await page.click('[data-testid="next-step"]');
  // ... 更多步骤
  await page.click('[data-testid="export"]');
  await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
});
```

### 7.3 性能优化

#### 7.3.1 渲染性能

**优化策略**:
- 使用 `React.memo` 包装纯组件
- 使用 `useCallback` 缓存回调函数
- 使用 `useMemo` 缓存计算结果
- 列表渲染使用稳定的 key
- 避免在渲染函数中创建新对象

**性能指标**:
- 首次渲染时间 ≤ 1 秒
- 重新渲染时间 ≤ 100ms
- FPS ≥ 60

#### 7.3.2 包体积优化

**优化策略**:
- 按需加载组件（Code Splitting）
-  Tree Shaking 移除未使用代码
- 压缩图片和资源
- 使用 WebP 格式

**体积限制**:
- 主包 ≤ 2MB
- 总包体积 ≤ 50MB
- 首屏加载资源 ≤ 500KB

#### 7.3.3 启动性能

**优化策略**:
- 预加载关键资源
- 延迟加载非关键组件
- 使用 Rust 后端加速
- 减少初始化计算

**性能指标**:
- 冷启动 ≤ 3 秒
- 热启动 ≤ 1 秒
- 可交互时间 ≤ 2 秒

### 7.4 错误监控

#### 7.4.1 错误分类

**错误级别**:
- P0: 崩溃级（程序闪退、数据丢失）
- P1: 严重级（核心功能不可用）
- P2: 一般级（部分功能异常）
- P3: 轻微级（UI 显示问题）

#### 7.4.2 错误收集

**收集内容**:
- 错误堆栈
- 用户操作步骤
- 系统环境信息
- 时间戳

**存储方式**:
- 本地日志文件
- 可选上传到服务器

#### 7.4.3 错误处理流程

```
错误发生 → 捕获错误 → 记录日志 → 显示提示 → 尝试恢复 → 用户反馈
```

### 7.5 文档体系

#### 7.5.1 文档分类

**开发文档**:
- `ARCHITECTURE.md`: 架构设计
- `API.md`: API 文档
- `CONTRIBUTING.md`: 贡献指南
- `CODE_STYLE.md`: 代码规范

**用户文档**:
- `README.md`: 项目说明
- `USER_GUIDE.md`: 用户指南
- `FAQ.md`: 常见问题
- `CHANGELOG.md`: 更新日志

**设计文档**:
- `TARGET_SELECTOR_GUIDE.md`: 目标选择系统
- `MARK_SYSTEM_GUIDE.md`: 标记系统
- `VALIDATION_GUIDE.md`: 校验系统

#### 7.5.2 文档维护

**更新策略**:
- 代码变更同步更新文档
- 每个 PR 必须包含文档更新
- 定期审查文档准确性

**文档质量**:
- 代码示例可运行
- 截图清晰最新
- 链接有效
- 中文书写规范

---

## 八、开发里程碑

### 8.1 阶段划分

#### Phase 1: 核心架构（已完成 80%）
**时间**: 2026-05-01 ~ 2026-05-31
**目标**: 完成核心架构和基础功能

**已完成**:
- ✅ 原子层定义（枚举、接口、常量）
- ✅ 模板层框架（24 个效果、12 个条件、8 个消耗）
- ✅ 目标选择系统（24 种类型、12 个过滤器、5 个排序器）
- ✅ 标记系统（定义管理、实例管理）
- ✅ 配置管理器
- ✅ 规则校验器
- ✅ 基础 UI 组件
- ✅ 四步编辑流程框架

**待完成**:
- [ ] 所有模板的独立文件实现
- [ ] 完整的目标选择 UI
- [ ] 标记编辑器 UI
- [ ] 配置编辑器 UI

**验收标准**:
- [ ] TypeScript 类型检查通过
- [ ] 核心功能可运行
- [ ] 单元测试覆盖率 ≥ 60%

#### Phase 2: 功能完善（进行中）
**时间**: 2026-06-01 ~ 2026-06-30
**目标**: 完成所有核心功能

**计划任务**:
- [ ] 完整的 Step 3 编辑器（目标选择 UI 集成）
- [ ] 标记可视化编辑器
- [ ] 配置可视化编辑器
- [ ] 批量导入导出功能
- [ ] 数据持久化（本地存储）
- [ ] 撤销/重做功能
- [ ] 搜索和筛选功能
- [ ] 模板系统（预设卡牌模板）

**验收标准**:
- [ ] 所有功能正常工作
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 通过手动测试清单
- [ ] 文档齐全

#### Phase 3: 优化与测试
**时间**: 2026-07-01 ~ 2026-07-31
**目标**: 性能优化和全面测试

**计划任务**:
- [ ] 性能分析和优化
- [ ] 包体积优化
- [ ] 启动速度优化
- [ ] 完整测试套件
- [ ] E2E 测试
- [ ] 压力测试
- [ ] 边界测试
- [ ] 兼容性测试（三平台）

**验收标准**:
- [ ] 性能指标达标
- [ ] 测试覆盖率 ≥ 90%
- [ ] 无 P0/P1 级别 bug
- [ ] 三平台构建成功

#### Phase 4: Beta 发布
**时间**: 2026-08-01 ~ 2026-08-31
**目标**: 发布 Beta 版本，收集反馈

**计划任务**:
- [ ] 内部测试
- [ ] 小范围用户测试
- [ ] 收集反馈
- [ ] 修复 bug
- [ ] 优化体验
- [ ] 准备正式发布

**验收标准**:
- [ ] 用户满意度 ≥ 80%
- [ ] 严重 bug 全部修复
- [ ] 文档完善
- [ ] 发布渠道准备就绪

#### Phase 5: 正式发布
**时间**: 2026-09-01
**目标**: 发布 v1.0 正式版本

**发布内容**:
- Windows 版本（.exe）
- macOS 版本（.app）
- Linux 版本（.deb/.AppImage）
- 完整文档
- 官方网站

### 8.2 迭代计划

#### 迭代周期
- 每 2 周为一个迭代
- 每迭代第一天为规划日
- 每迭代最后一天为回顾日

#### 迭代流程
```
迭代规划 → 每日站会 → 开发实施 → 代码审查 → 测试验证 → 迭代回顾
```

#### 当前迭代（Iteration #5）
**时间**: 2026-05-26 ~ 2026-06-09
**目标**: 完成目标选择系统集成

**任务**:
- [x] 目标选择系统核心实现
- [x] 12 个过滤器实现
- [x] 5 个排序器实现
- [x] 承接主体系统实现
- [ ] 目标选择 UI 组件完成
- [ ] 与 Step3 编辑器集成
- [ ] 相关测试编写

### 8.3 关键路径

```
目标选择 UI → Step3 集成 → 功能测试 → 性能优化 → Beta 测试
     ↓              ↓           ↓           ↓           ↓
  2026-06-05   2026-06-12  2026-06-19  2026-06-26  2026-07-03
```

**关键里程碑**:
1. **2026-06-05**: 目标选择 UI 完成
2. **2026-06-12**: Step3 完整功能可用
3. **2026-06-19**: 所有核心功能完成
4. **2026-06-26**: 性能优化完成
5. **2026-07-03**: Beta 版本发布

---

## 九、团队与分工

### 9.1 团队结构

```
项目负责人 (1 人)
    ├── 架构组 (2 人)
    │   ├── 前端架构师
    │   └── Rust 后端工程师
    ├── 开发组 (4 人)
    │   ├── 前端开发 x2
    │   ├── UI/UX设计师
    │   └── 测试工程师
    └── 文档组 (1 人兼职)
        └── 技术文档工程师
```

### 9.2 角色职责

#### 项目负责人
- 项目整体规划
- 进度跟踪和管理
- 技术决策
- 对外沟通

#### 前端架构师
- 前端架构设计
- 代码质量把控
- 技术难点攻关
- 代码审查

#### Rust 后端工程师
- Tauri 后端开发
- 系统 API 封装
- 性能优化
- 安全性保障

#### 前端开发
- UI 组件开发
- 功能实现
- 单元测试
- Bug 修复

#### UI/UX 设计师
- 界面设计
- 交互设计
- 设计规范制定
- 设计资源输出

#### 测试工程师
- 测试计划制定
- 测试用例编写
- 自动化测试
- 质量把控

#### 技术文档工程师
- 文档体系规划
- 用户文档编写
- API 文档维护
- 文档质量审核

### 9.3 协作流程

#### 代码审查流程
```
开发者提交 PR → 自动 CI 检查 → 架构师审查 → 测试验证 → 合并到主分支
```

**审查要点**:
- 代码质量（ESLint、TypeScript）
- 架构合规性（依赖关系、分层）
- 测试覆盖（单元测试、集成测试）
- 文档更新

#### 每日站会
- 时间：每天上午 10:00
- 时长：≤ 15 分钟
- 内容：
  - 昨天完成了什么
  - 今天计划做什么
  - 有什么阻碍

#### 迭代规划会
- 时间：每迭代第一天
- 时长：≤ 2 小时
- 内容：
  - 回顾上个迭代
  - 规划本迭代任务
  - 任务分配

#### 迭代回顾会
- 时间：每迭代最后一天
- 时长：≤ 1 小时
- 内容：
  - 本迭代完成情况
  - 做得好的地方
  - 需要改进的地方
  - 改进行动项

---

## 十、风险管理

### 10.1 技术风险

#### 风险 1: React 19 并发渲染问题
**概率**: 中  
**影响**: 高  
**应对措施**:
- 使用 `listKey` 强制重新渲染
- 避免在渲染中创建新对象
- 充分测试列表操作

**状态**: ✅ 已解决

#### 风险 2: Tauri v2 兼容性问题
**概率**: 中  
**影响**: 中  
**应对措施**:
- 密切关注 Tauri 官方更新
- 准备备选方案（Electron）
- 在三平台充分测试

**状态**: 🟡 监控中

#### 风险 3: 性能问题（大数据量）
**概率**: 高  
**影响**: 中  
**应对措施**:
- 使用虚拟列表
- 分页加载
- Web Worker 处理计算
- 性能监控和 profiling

**状态**: 🟡 监控中

### 10.2 进度风险

#### 风险 1: 功能范围蔓延
**概率**: 高  
**影响**: 高  
**应对措施**:
- 严格遵循 MVP 原则
- 功能优先级排序
- 定期审查范围
- 勇于说"不"

**状态**: 🟡 监控中

#### 风险 2: 技术债务积累
**概率**: 中  
**影响**: 高  
**应对措施**:
- 定期重构日
- 代码审查严格
- 自动化测试覆盖
- 文档同步更新

**状态**: 🟢 可控

### 10.3 人员风险

#### 风险 1: 核心人员流失
**概率**: 低  
**影响**: 高  
**应对措施**:
- 知识文档化
- 代码规范化
- 交叉培训
- 团队备份

**状态**: 🟢 可控

### 10.4 风险矩阵

| 风险 | 概率 | 影响 | 优先级 | 状态 |
|-----|------|------|--------|------|
| React 并发渲染 | 中 | 高 | P1 | ✅ 已解决 |
| Tauri 兼容性 | 中 | 中 | P2 | 🟡 监控 |
| 性能问题 | 高 | 中 | P2 | 🟡 监控 |
| 范围蔓延 | 高 | 高 | P1 | 🟡 监控 |
| 技术债务 | 中 | 高 | P2 | 🟢 可控 |
| 人员流失 | 低 | 高 | P3 | 🟢 可控 |

---

## 十一、附录

### 11.1 术语表

| 术语 | 定义 |
|-----|------|
| 原子化 | 将复杂系统拆解为不可再分的最小单元 |
| 承接主体 | 在条件和效果之间传递的目标信息 |
| 标记 | 游戏中的状态标识，可叠加、有持续时间 |
| 过滤器 | 对目标池进行二次筛选的原子操作 |
| 排序器 | 对过滤后的目标池进行排序的原子操作 |
| 鲁棒性 | 系统在异常输入下保持正常运行的能力 |

### 11.2 参考资料

#### 技术文档
- [React 19 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Tauri v2 官方文档](https://v2.tauri.app/)
- [Ant Design 6.x 文档](https://ant.design/)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)

#### 设计资源
- [Figma 设计文件](#)
- [设计规范文档](#)
- [图标资源库](#)

#### 竞品分析
- [Hearthstone Deck Tracker 分析](#)
- [MTG Arena 分析](#)

### 11.3 相关文档

#### 项目文档
- `README.md`: 项目说明和快速开始
- `MIGRATION_GUIDE.md`: 架构迁移指南
- `PROJECT_STRUCTURE.md`: 项目结构详解
- `SELF_CHECK_CHECKLIST.md`: AI 自检清单
- `TARGET_SELECTOR_GUIDE.md`: 目标选择系统指南

#### 设计文档
- 《对峙》游戏规则文档
- 卡牌数据结构定义
- 效果模板规范

### 11.4 变更日志

#### v2.0 (2026-05-29)
**新增**:
- ✅ 完整的目标选择系统
- ✅ 24 种基础目标类型
- ✅ 12 个目标过滤器
- ✅ 5 个目标排序器
- ✅ 承接主体系统
- ✅ 目标选择 UI 组件

**改进**:
- 优化了类型定义
- 改进了错误处理
- 完善了文档

**修复**:
- 修复了类型检查错误
- 修复了导入路径问题

#### v1.0 (2026-05-15)
**初始版本**:
- 核心架构搭建
- 基础编辑功能
- 四步向导流程
- 标记系统框架
- 配置管理系统

---

## 文档审批

| 角色 | 姓名 | 签字 | 日期 |
|-----|------|------|------|
| 项目负责人 | | | |
| 前端架构师 | | | |
| 产品经理 | | | |

**最后更新**: 2026-05-29  
**下次审查**: 2026-06-15  
**文档版本**: v2.0
