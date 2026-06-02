# 目标选择系统使用指南

## 快速开始

### 1. 基本使用示例

```typescript
import { TargetSelector, TargetType, ITargetConfig } from "./target";

// 创建目标选择器实例
const selector = new TargetSelector();

// 定义目标配置
const config: ITargetConfig = {
  type: TargetType.ALL_ENEMIES,
  filters: [],
  limit: 0
};

// 定义上下文
const context = {
  self: { /* 自己单位 */ },
  allUnits: [ /* 所有单位 */ ]
};

// 选择目标
const targets = selector.select(config, context);
```

### 2. 使用过滤器

```typescript
const config: ITargetConfig = {
  type: TargetType.ALL_ENEMIES,
  filters: [
    {
      filterId: "filter_by_attribute",
      params: {
        attribute: "life",
        operator: "<=",
        value: 5
      },
      operator: "AND"
    },
    {
      filterId: "filter_by_mark",
      params: {
        mark: "mark_renxin",
        operator: ">=",
        count: 2
      },
      operator: "AND"
    }
  ],
  limit: 3
};

// 选择生命<=5 且仁心标记>=2 的敌方单位，最多 3 个
const targets = selector.select(config, context);
```

### 3. 使用排序器

```typescript
const config: ITargetConfig = {
  type: TargetType.ALL_ENEMIES,
  filters: [],
  sorter: {
    sorterId: "sort_by_attribute",
    params: {
      attribute: "life",
      order: "asc" // 升序（生命最低的优先）
    }
  },
  limit: 1
};

// 选择生命最低的敌方单位
const targets = selector.select(config, context);
```

### 4. 承接主体系统

```typescript
// 第一步：条件选择目标并保存为承接主体
const conditionConfig: ITargetConfig = {
  type: TargetType.ONE_ENEMY,
  filters: [
    {
      filterId: "filter_by_attribute",
      params: {
        attribute: "life",
        operator: ">=",
        value: 5
      },
      operator: "AND"
    }
  ],
  saveAsInherit: "main_target" // 保存为承接主体
};

const conditionTargets = selector.select(conditionConfig, context);
// 现在 context.inheritedTargets.main_target 已设置

// 第二步：效果使用承接主体
const effectConfig: ITargetConfig = {
  type: TargetType.INHERIT,
  inheritKey: "main_target", // 使用承接主体
  filters: [
    {
      filterId: "filter_by_relation",
      params: {
        relation: "life_lte_inherit" // 生命<=承接主体
      },
      operator: "AND"
    }
  ]
};

const effectTargets = selector.select(effectConfig, context);
```

### 5. 复杂组合示例

```typescript
const complexConfig: ITargetConfig = {
  type: TargetType.ALL_ENEMIES,
  filters: [
    // 过滤生命<=10 的单位
    {
      filterId: "filter_by_attribute",
      params: { attribute: "life", operator: "<=", value: 10 },
      operator: "AND"
    },
    // 过滤有仁心标记的单位
    {
      filterId: "filter_by_mark",
      params: { mark: "renxin", operator: ">=", count: 1 },
      operator: "AND"
    },
    // 排除自己
    {
      filterId: "filter_exclude_self",
      params: {},
      operator: "AND"
    }
  ],
  sorter: {
    sorterId: "sort_by_attribute",
    params: { attribute: "life", order: "asc" }
  },
  limit: 3,
  saveAsInherit: "low_life_enemies"
};

const targets = selector.select(complexConfig, context);
// 结果：生命<=10 且有仁心标记的敌方单位，按生命升序排序，最多 3 个
```

## API 参考

### TargetSelector

#### 构造函数
```typescript
constructor()
```
自动注册所有内置过滤器和排序器。

#### 方法

##### select(config, context)
选择目标的主要方法。

**参数**:
- `config: ITargetConfig` - 目标选择配置
- `context: ITargetContext` - 选择上下文

**返回**: `ITargetUnit[]` - 选中的目标列表

##### selectMultiple(configs, context)
批量选择多个目标。

**参数**:
- `configs: ITargetConfig[]` - 多个目标选择配置
- `context: ITargetContext` - 选择上下文

**返回**: `Record<string, ITargetUnit[]>` - Key 为目标组名称，Value 为目标列表

##### validateConfig(config)
验证目标配置是否合法。

**参数**:
- `config: ITargetConfig` - 待验证的配置

**返回**: `{ valid: boolean; errors: string[] }` - 验证结果

### ITargetConfig

目标选择配置对象。

```typescript
interface ITargetConfig {
  type: TargetType;              // 基础目标类型
  filters: ITargetFilter[];      // 过滤器列表
  sorter?: ITargetSorter;        // 排序器（可选）
  limit?: number;                // 数量限制（0=无限制）
  inheritFrom?: "conditions" | "effects"; // 承接来源
  inheritKey?: string;           // 承接主体 Key
  saveAsInherit?: string;        // 保存为承接主体的 Key
}
```

### TargetType（24 种）

#### 单目标
- `SELF` - 自己
- `ONE_ENEMY` - 任意一名敌方
- `ONE_ALLY` - 任意一名友方
- `ONE_UNIT` - 任意一名单位
- `DAMAGE_SOURCE` - 伤害来源
- `TRIGGER_UNIT` - 触发者
- `INHERIT` - 承接主体

#### 多目标
- `ALL_ENEMIES` - 所有敌方
- `ALL_ALLIES` - 所有友方
- `ALL_UNITS` - 所有单位
- `ALL_ALIVE` - 所有存活单位
- `ALL_DEAD` - 所有阵亡单位

#### 位置相关
- `ADJACENT` - 所有接壤单位
- `ADJACENT_ENEMY` - 所有接壤敌方
- `ADJACENT_ALLY` - 所有接壤友方
- `LEFT_ADJACENT` - 左侧接壤单位
- `RIGHT_ADJACENT` - 右侧接壤单位

#### 特殊
- `RANDOM_ENEMY` - 随机一名敌方
- `RANDOM_ALLY` - 随机一名友方
- `RANDOM_UNIT` - 随机一名单位
- `LOWEST_LIFE` - 生命最低的单位
- `HIGHEST_LIFE` - 生命最高的单位
- `LOWEST_ARMOR` - 护甲最低的单位
- `HIGHEST_ARMOR` - 护甲最高的单位
- `LOWEST_ENERGY` - 技力最低的单位
- `HIGHEST_ENERGY` - 技力最高的单位

### 过滤器（12 个）

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

### 排序器（5 个）

| 排序器 ID | 功能 | 参数 |
|----------|------|------|
| `sort_by_attribute` | 按属性排序 | attribute, order |
| `sort_by_mark` | 按标记排序 | mark, order |
| `sort_by_distance` | 按距离排序 | order |
| `sort_by_random` | 随机排序 | 无 |
| `sort_by_player_order` | 按行动顺序排序 | order |

### RelationType（关系类型）

- `LIFE_GTE_INHERIT` - 生命≥承接
- `LIFE_LTE_INHERIT` - 生命≤承接
- `MARK_GTE_INHERIT` - 标记数≥承接
- `MARK_LTE_INHERIT` - 标记数≤承接
- `HAND_GTE_INHERIT` - 手牌≥承接
- `HAND_LTE_INHERIT` - 手牌≤承接
- `DAMAGE_GTE_INHERIT` - 伤害≥承接
- `DAMAGE_LTE_INHERIT` - 伤害≤承接

## UI 组件使用

```tsx
import { TargetSelectorUI } from "./target/components/TargetSelectorUI";

function MyComponent() {
  const [targetConfig, setTargetConfig] = useState<ITargetConfig>({
    type: TargetType.SELF,
    filters: [],
    limit: 0
  });

  return (
    <TargetSelectorUI
      value={targetConfig}
      onChange={setTargetConfig}
      availableMarks={[
        { id: "mark_renxin", name: "仁心" },
        { id: "mark_fengbao", name: "锋爆" }
      ]}
      inheritKeys={["main_target", "secondary_target"]}
    />
  );
}
```

## 最佳实践

### 1. 性能优化
- 避免在循环中创建新的 TargetSelector 实例
- 复用相同的 selector 实例
- 过滤器链不宜过长（建议不超过 5 个）

### 2. 错误处理
```typescript
try {
  const targets = selector.select(config, context);
  if (targets.length === 0) {
    console.warn("未找到符合条件的目标");
    // 处理空目标池的情况
  }
} catch (error) {
  console.error("目标选择失败:", error);
  // 使用兜底逻辑
}
```

### 3. 配置验证
```typescript
const validation = selector.validateConfig(config);
if (!validation.valid) {
  console.error("配置验证失败:", validation.errors);
  // 修复配置错误
  return;
}
```

### 4. 承接主体链式使用
```typescript
// 第一步：选择主目标
const mainConfig: ITargetConfig = {
  type: TargetType.ONE_ENEMY,
  saveAsInherit: "main"
};
selector.select(mainConfig, context);

// 第二步：基于主目标选择次级目标
const secondaryConfig: ITargetConfig = {
  type: TargetType.ALL_ENEMIES,
  filters: [
    {
      filterId: "filter_by_relation",
      params: { relation: "life_lte_inherit" },
      operator: "AND"
    }
  ],
  inheritKey: "main",
  saveAsInherit: "secondary"
};
selector.select(secondaryConfig, context);

// 第三步：使用次级目标
// ...
```

## 鲁棒性保障

1. **空目标池处理**: 返回空数组，不抛出错误
2. **非法参数处理**: 跳过非法参数的过滤器，继续执行
3. **承接主体缺失**: 返回空数组，不崩溃
4. **循环引用检测**: 自动检测并阻止循环引用
5. **阵亡单位自动排除**: 除非明确指定，否则自动排除阵亡单位

## 扩展指南

### 添加新过滤器
1. 创建 `src/target/filters/my_filter.ts`
2. 实现 `ITargetFilterImpl` 接口
3. 在 `TargetSelector` 中注册

### 添加新排序器
1. 创建 `src/target/sorters/my_sorter.ts`
2. 实现 `ITargetSorterImpl` 接口
3. 在 `TargetSelector` 中注册

## 常见问题

### Q: 如何选择随机目标？
A: 使用 `TargetType.RANDOM_ENEMY` 或使用 `sort_by_random` 排序器。

### Q: 如何实现链式目标选择？
A: 使用 `saveAsInherit` 保存第一步的结果，然后在后续步骤中使用 `TargetType.INHERIT`。

### Q: 过滤器太多怎么办？
A: 使用 `limit` 参数限制最终返回的目标数量。

### Q: 如何处理阵亡单位？
A: 默认自动排除阵亡单位，如需包含阵亡单位，使用 `filter_by_alive` 过滤器并设置 `isAlive: false`。
