# 《对峙》卡牌编辑器项目结构

## 完整目录树

```
CardMaker/
├── src/
│   ├── atomic/                          # 原子层（最底层，无依赖）
│   │   ├── enums.ts                     # 9 个核心枚举
│   │   ├── constants.ts                 # 全局常量和配置键
│   │   ├── interfaces.ts                # 10+ 个核心接口
│   │   └── index.ts                     # 统一导出
│   │
│   ├── templates/                       # 模板层（依赖原子层）
│   │   ├── effects/                     # 24 个原子效果模板
│   │   │   ├── eff_modify_attribute.ts  # 修改属性
│   │   │   ├── eff_set_attribute_max.ts # 修改属性上限
│   │   │   ├── eff_add_mark.ts          # 添加标记
│   │   │   ├── eff_remove_mark.ts       # 移除标记
│   │   │   ├── eff_remove_all_marks.ts  # 移除所有标记
│   │   │   ├── eff_modify_mark_stack.ts # 修改标记堆叠
│   │   │   ├── eff_draw_card.ts         # 抽取卡牌
│   │   │   ├── eff_discard_card.ts      # 弃置卡牌
│   │   │   ├── eff_discard_card_type.ts # 弃置指定类型
│   │   │   ├── eff_force_discard.ts     # 强制弃牌
│   │   │   ├── eff_equip_card.ts        # 装备卡牌
│   │   │   ├── eff_unequip_card.ts      # 卸下卡牌
│   │   │   ├── eff_deal_damage.ts       # 造成伤害
│   │   │   ├── eff_heal.ts              # 治疗
│   │   │   ├── eff_convert_damage_type.ts # 转换伤害类型
│   │   │   ├── eff_ignore_armor.ts      # 无视护甲
│   │   │   ├── eff_skip_phase.ts        # 跳过阶段
│   │   │   ├── eff_reset_cooldown.ts    # 重置冷却
│   │   │   ├── eff_modify_priority.ts   # 修改优先级
│   │   │   ├── eff_gain_extra_attack.ts # 额外攻击
│   │   │   ├── eff_judge.ts             # 判定
│   │   │   ├── eff_counter.ts           # 反制
│   │   │   ├── eff_chain_effect.ts      # 连锁效果
│   │   │   ├── eff_trigger_effect.ts    # 触发效果
│   │   │   └── index.ts                 # 统一导出
│   │   │
│   │   ├── conditions/                  # 12 个条件模板
│   │   │   ├── cond_always.ts           # 无条件
│   │   │   ├── cond_check_attribute.ts  # 检查属性
│   │   │   ├── cond_check_mark.ts       # 检查标记
│   │   │   ├── cond_check_mark_stack.ts # 检查标记堆叠
│   │   │   ├── cond_check_card_count.ts # 检查手牌数量
│   │   │   ├── cond_check_card_type_count.ts # 检查类型数量
│   │   │   ├── cond_check_turn_count.ts # 检查回合数
│   │   │   ├── cond_check_phase.ts      # 检查阶段
│   │   │   ├── cond_check_target_relation.ts # 检查关系
│   │   │   ├── cond_check_damage_type.ts # 检查伤害类型
│   │   │   ├── cond_check_skill_used.ts # 检查技能使用
│   │   │   ├── cond_check_fatigue.ts    # 检查疲劳
│   │   │   └── index.ts                 # 统一导出
│   │   │
│   │   └── costs/                       # 8 个消耗模板
│   │       ├── cost_none.ts             # 无消耗
│   │       ├── cost_attribute.ts        # 消耗属性
│   │       ├── cost_mark.ts             # 消耗标记
│   │       ├── cost_discard_card.ts     # 弃置手牌
│   │       ├── cost_discard_card_type.ts # 弃置指定类型
│   │       ├── cost_skip_phase.ts       # 跳过阶段
│   │       ├── cost_cooldown.ts         # 增加冷却
│   │       ├── cost_use_limit.ts        # 减少次数
│   │       └── index.ts                 # 统一导出
│   │
│   ├── store/                           # 数据层（依赖原子层）
│   │   ├── cardStore.ts                 # 卡牌状态管理（Zustand）
│   │   ├── markManager.ts               # 标记管理器
│   │   │   - MarkDefinitionManager      # 标记定义管理
│   │   │   - MarkInstanceManager        # 标记实例管理
│   │   └── configManager.ts             # 配置管理器
│   │       - ConfigManager              # 配置管理
│   │       - ValidationManager          # 规则校验
│   │
│   ├── utils/                           # 业务层工具
│   │   ├── buildDesc.ts                 # 旧效果描述生成（兼容）
│   │   └── helpers.ts                   # 新通用工具
│   │       - buildEffectDesc            # 新效果描述生成
│   │       - safeGet/safeSet            # 安全访问对象
│   │       - clamp                      # 数值截断
│   │       - truncateString             # 字符串截断
│   │       - validateParams             # 参数校验
│   │       - deepClone                  # 深拷贝
│   │       - generateId                 # ID 生成
│   │
│   ├── components/                      # 应用层组件
│   │   ├── CardPreview.tsx              # 卡牌预览组件
│   │   └── ErrorBoundary.tsx            # 错误边界组件
│   │
│   ├── pages/                           # 应用层页面
│   │   ├── Step1_CardType.tsx           # Step 1: 选择卡牌类型
│   │   ├── Step2_BasicInfo.tsx          # Step 2: 填写基本信息
│   │   └── Step3_EffectEdit.tsx         # Step 3: 配置技能效果
│   │
│   ├── data/                            # 配置数据
│   │   ├── effectLibrary.json           # 旧效果库（兼容）
│   │   └── marks/                       # 标记定义预设
│   │       ├── renxin.json              # 仁心标记
│   │       ├── fengbao.json             # 锋爆标记
│   │       ├── jianyi.json              # 坚毅标记
│   │       └── xuruo.json               # 虚弱标记
│   │
│   ├── types/                           # 旧类型定义（兼容）
│   │   └── card.ts                      # 卡牌类型（保留）
│   │
│   ├── App.tsx                          # 主应用入口
│   ├── main.tsx                         # React 入口
│   ├── index.css                        # 全局样式
│   └── vite-env.d.ts                    # Vite 类型声明
│
├── src-tauri/                           # Tauri 后端
│   ├── src/
│   │   └── main.rs                      # Rust 入口
│   ├── Cargo.toml                       # Rust 依赖
│   ├── build.rs                         # 构建脚本
│   └── tauri.conf.json                  # Tauri 配置
│
├── index.html                           # HTML 入口
├── package.json                         # npm 配置
├── tsconfig.json                        # TypeScript 配置
├── tsconfig.node.json                   # TypeScript Node 配置
├── vite.config.ts                       # Vite 配置
├── README.md                            # 项目说明
└── MIGRATION_GUIDE.md                   # 迁移指南
```

## 依赖关系图

```
┌─────────────────────────────────────────┐
│ 应用层 (Application Layer)              │
│  - components/                          │
│  - pages/                               │
│  - App.tsx                              │
│  依赖：业务层、数据层、原子层           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 业务层 (Business Layer)                 │
│  - utils/                               │
│  依赖：模板层、数据层、原子层           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 模板层 (Template Layer)                 │
│  - templates/effects/                   │
│  - templates/conditions/                │
│  - templates/costs/                     │
│  依赖：原子层                           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 数据层 (Data Layer)                     │
│  - store/cardStore.ts                   │
│  - store/markManager.ts                 │
│  - store/configManager.ts               │
│  - data/                                │
│  依赖：原子层                           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 原子层 (Atomic Layer)                   │
│  - atomic/enums.ts                      │
│  - atomic/constants.ts                  │
│  - atomic/interfaces.ts                 │
│  依赖：无                               │
└─────────────────────────────────────────┘
```

## 核心模块说明

### 原子层 (atomic/)
**职责**: 定义整个系统的基础类型和常量

**文件说明**:
- `enums.ts`: 9 个核心枚举
  - `AttributeType`: 属性类型
  - `MarkType`: 标记类型
  - `LogicOperator`: 逻辑运算符
  - `ComparisonOperator`: 比较运算符
  - `Timing`: 时机
  - `StackingType`: 叠加类型
  - `TargetType`: 目标类型
  - `LimitType`: 限制类型
  - `MarkExpireBehavior`: 标记过期行为
  - `MarkPolarity`: 标记正负性
  - `ParamType`: 参数类型

- `constants.ts`: 全局常量
  - `CONFIG_KEYS`: 配置键名
  - `DEFAULT_CONFIG`: 默认配置值
  - `GLOBAL_CONSTANTS`: 全局常量（字符串长度限制等）

- `interfaces.ts`: 核心接口
  - `IBase`: 基础接口（所有接口必须继承）
  - `IParamDefinition`: 参数定义
  - `IAtomicEffect`: 原子效果
  - `IEffectInstance`: 效果实例
  - `IConditionInstance`: 条件实例
  - `ICostInstance`: 消耗实例
  - `IMarkDefinition`: 标记定义
  - `ISkill`: 技能
  - `ICard`: 卡牌
  - `IConfig`: 配置
  - `IValidationRule`: 校验规则

### 模板层 (templates/)
**职责**: 实现所有游戏逻辑的原子单元

**特点**:
- 每个模板都是纯数据，无业务逻辑
- 所有模板都实现 `IAtomicEffect` 接口
- 模板之间相互独立，无依赖关系
- 通过组合模板实现复杂效果

### 数据层 (store/)
**职责**: 管理所有状态和数据

**核心管理器**:
1. **MarkDefinitionManager**
   - 管理所有标记定义（内置 + 自定义）
   - 提供增删改查接口
   - 支持导入导出

2. **MarkInstanceManager**
   - 管理游戏运行时的标记实例
   - 处理标记生命周期
   - 支持各种叠加方式

3. **ConfigManager**
   - 管理所有游戏配置
   - 支持动态修改
   - 提供默认值兜底

4. **ValidationManager**
   - 实现多层级校验
   - 校验规则可配置
   - 返回明确错误信息

### 业务层 (utils/)
**职责**: 提供业务逻辑工具函数

**核心函数**:
- `buildEffectDesc`: 根据模板和参数生成描述
- `safeGet/safeSet`: 安全访问对象属性
- `clamp`: 数值截断到合法范围
- `truncateString`: 字符串截断
- `validateParams`: 校验参数合法性
- `deepClone`: 深拷贝
- `generateId`: 生成唯一 ID

### 应用层 (components/, pages/)
**职责**: UI 组件和用户交互

**特点**:
- 使用错误边界组件包裹
- 所有输入都有校验
- 所有错误都有友好提示
- 支持实时预览

## 数据流向

```
用户输入 → 应用层校验 → 业务层处理 → 数据层存储
                                     ↓
                                原子层类型约束
                                     ↓
                                模板层规则约束
```

## 扩展流程

### 添加新效果模板
1. 在 `templates/effects/` 创建新文件
2. 实现 `IAtomicEffect` 接口
3. 在 `index.ts` 中导出
4. 添加校验规则（可选）

### 添加新标记
1. 在 `data/marks/` 创建 JSON 文件
2. 实现 `IMarkDefinition` 接口
3. 系统自动加载

### 添加新配置
1. 在 `constants.ts` 添加配置键
2. 在 `DEFAULT_CONFIG` 添加默认值
3. 在 `ConfigManager` 添加访问方法

### 添加新校验规则
1. 在 `ValidationManager` 的 `initValidationRules` 中添加
2. 实现校验逻辑
3. 返回明确错误信息

## 性能优化

- 使用 `React.memo` 减少不必要的重渲染
- 使用 `useCallback` 缓存回调函数
- 使用 `useMemo` 缓存计算结果
- 列表渲染使用稳定的 key
- 避免在渲染函数中创建新对象

## 安全机制

- 所有用户输入都经过 sanitization
- 所有数值都有边界检查
- 所有字符串都有长度限制
- 所有选择都有兜底值
- 所有异步操作都有 try-catch
- 所有错误都被捕获并记录
- 使用错误边界防止白屏
