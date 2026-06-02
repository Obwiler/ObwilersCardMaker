import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Tabs,
  Button,
  Input,
  Switch,
  InputNumber,
  Collapse,
  Select,
  Card,
  Space,
  Typography,
  Empty,
  Popconfirm,
  Table,
  AutoComplete,
  Alert,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import type { ISkill, IConditionInstance, ICostInstance, IEffectInstance, IFiveSegmentEffect, IValidationResult, IValidationMessage } from "@/atomic";
import {
  AttributeType,
  Timing,
  StackingType,
  TargetType,
  LogicOperator,
  CardType,
  EffectLevel,
  SubjectType,
  PredicateType,
  NoteCategory,
  TIMING_LABELS,
  STACKING_LABELS,
  TARGET_TYPE_LABELS,
  LOGIC_LABELS,
  ATTRIBUTE_LABELS,
  SUBJECT_LABELS,
  PREDICATE_LABELS,
  NOTE_CATEGORY_LABELS,
} from "@/atomic";
import { validateFiveSegmentEffects } from "@/utils/grammarValidator";
import {
  conditionTemplates,
  costTemplates,
  effectTemplates,
} from "@/templates";
import {
  FIVESEG_CONDITION_TEMPLATES,
  FIVESEG_OBJECT_TEMPLATES,
  FIVESEG_PREDICATE_GROUPS,
} from "@/templates/fiveSegment";
import { generateCardDescription } from "@/utils/exporters";
import { markManager, useCardStore } from "@/store";
import { generateId } from "@/utils/helpers";

const { Text, Title, Paragraph } = Typography;
const { OptGroup, Option } = Select;

const TIMING_OPTIONS = Object.values(Timing).map((v) => ({
  value: v,
  label: TIMING_LABELS[v] ?? v,
}));

const STACKING_OPTIONS = Object.values(StackingType).map((v) => ({
  value: v,
  label: STACKING_LABELS[v] ?? v,
}));

const TARGET_OPTIONS = Object.values(TargetType).map((v) => ({
  value: v,
  label: TARGET_TYPE_LABELS[v] ?? v,
}));

const LOGIC_OPTIONS = Object.values(LogicOperator).map((v) => ({
  value: v,
  label: LOGIC_LABELS[v] ?? v,
}));

const ATTRIBUTE_OPTIONS = Object.values(AttributeType).map((v) => ({
  value: v,
  label: ATTRIBUTE_LABELS[v] ?? v,
}));

function getMarkOptions() {
  return markManager.getAllMarks().map((m) => ({
    value: m.id,
    label: m.displayName || m.name,
  }));
}

function renderParamInput(
  param: { key: string; type: string; label: string; min?: number; max?: number; options?: unknown[] },
  value: unknown,
  onChange: (key: string, val: unknown) => void
) {
  const commonProps = {
    style: { width: "100%" },
    placeholder: param.label,
  };

  switch (param.type) {
    case "number":
      return (
        <InputNumber
          {...commonProps}
          min={param.min}
          max={param.max}
          value={value as number}
          onChange={(v) => onChange(param.key, v)}
        />
      );
    case "select":
      return (
        <Select
          {...commonProps}
          options={param.options as Array<{ label: string; value: string | number }>}
          value={value as string}
          onChange={(v) => onChange(param.key, v)}
        />
      );
    case "boolean":
      return (
        <Switch
          checked={!!value}
          onChange={(v) => onChange(param.key, v)}
        />
      );
    case "attribute":
      return (
        <Select
          {...commonProps}
          options={ATTRIBUTE_OPTIONS}
          value={value as string}
          onChange={(v) => onChange(param.key, v)}
        />
      );
    case "mark":
      return (
        <Select
          {...commonProps}
          options={getMarkOptions()}
          value={value as string}
          onChange={(v) => onChange(param.key, v)}
        />
      );
    case "string":
    default:
      return (
        <Input
          {...commonProps}
          value={value as string}
          onChange={(e) => onChange(param.key, e.target.value)}
        />
      );
  }
}

// ─── 五段式常量 ─────────────────────────────────────────

const EFFECT_LEVEL_OPTIONS = Object.values(EffectLevel).map((v) => ({
  value: v,
  label: v,
}));

const SUBJECT_OPTIONS = Object.values(SubjectType).map((v) => ({
  value: v,
  label: (SUBJECT_LABELS as Record<string, string>)[v] ?? v,
}));

const NOTE_CATEGORY_OPTIONS = Object.values(NoteCategory).map((v) => ({
  value: v,
  label: (NOTE_CATEGORY_LABELS as Record<string, string>)[v] ?? v,
}));

// 条件模板下拉选项（含自由输入）
const COND_TEMPLATE_OPTIONS = [
  { value: "__free__", label: "(自由输入)" },
  ...FIVESEG_CONDITION_TEMPLATES.map((t) => ({
    value: t.id,
    label: `${t.template}（${t.description}）`,
  })),
];

// 宾语模板下拉选项（含自由输入）
const OBJECT_TEMPLATE_OPTIONS = [
  { value: "__free__", label: "(自由输入)" },
  ...FIVESEG_OBJECT_TEMPLATES.map((t) => ({
    value: t.id,
    label: `${t.template}（${t.description}）`,
  })),
];

// 条件自动补全候选项
const COND_AUTOCOMPLETE_OPTIONS = FIVESEG_CONDITION_TEMPLATES.map((t) => ({
  value: t.template,
  label: t.template,
}));

// 宾语自动补全候选项
const OBJECT_AUTOCOMPLETE_OPTIONS = FIVESEG_OBJECT_TEMPLATES.map((t) => ({
  value: t.template,
  label: t.template,
}));

interface Step3Props {
  onNext: () => void;
  onPrev: () => void;
}

function Step3_EffectEdit({ onNext, onPrev }: Step3Props) {
  const currentCard = useCardStore((s) => s.currentCard);
  const updateAllSkills = useCardStore((s) => s.updateAllSkills);
  const addSkill = useCardStore((s) => s.addSkill);
  const removeSkill = useCardStore((s) => s.removeSkill);

  const [activeSkillIdx, setActiveSkillIdx] = useState<string>("0");
  const [pendingSkills, setPendingSkills] = useState<ISkill[]>(
    currentCard?.skills ? currentCard.skills.map((s) => ({ ...s })) : []
  );
  const [collapseActiveKeys, setCollapseActiveKeys] = useState<string[]>([
    "conditions",
    "costs",
    "effects",
  ]);
  const [flashItem, setFlashItem] = useState<string | null>(null);

  // 五段式模式
  const [editMode, setEditMode] = useState<"five_segment" | "template">("five_segment");
  const [pendingFiveSegment, setPendingFiveSegment] = useState<IFiveSegmentEffect[]>([]);
  const [validationResult, setValidationResult] = useState<IValidationResult | null>(null);

  const isBasic = currentCard?.type === CardType.BASIC;
  const maxSkills = isBasic ? 1 : 5;

  // 初始化 / 切换技能 Tab 时重新加载五段式数据
  useEffect(() => {
    const idx = Number(activeSkillIdx);
    if (!isNaN(idx) && currentCard?.skills[idx]) {
      const skill = currentCard.skills[idx] as ISkill & { fiveSegmentEffects?: IFiveSegmentEffect[] };
      setPendingFiveSegment(skill.fiveSegmentEffects || []);
    } else {
      setPendingFiveSegment([]);
    }
  }, [activeSkillIdx, currentCard]);

  // 五段式语法校验
  useEffect(() => {
    if (editMode === 'five_segment' && pendingFiveSegment.length > 0) {
      const result = validateFiveSegmentEffects(pendingFiveSegment);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [pendingFiveSegment, editMode]);

  const handleSkillChange = useCallback(
    (skillId: string, partial: Partial<ISkill>) => {
      setPendingSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, ...partial, updatedAt: Date.now() } : s))
      );
    },
    []
  );

  const handleAddInstance = useCallback(
    (
      skillId: string,
      type: "conditions" | "costs" | "effects",
      instance: IConditionInstance | ICostInstance | IEffectInstance
    ) => {
      setPendingSkills((prev) =>
        prev.map((s) => {
          if (s.id !== skillId) return s;
          const arr = [...s[type]] as typeof instance[];
          arr.push(instance);
          return { ...s, [type]: arr, updatedAt: Date.now() };
        })
      );
      setCollapseActiveKeys((prev) => {
        if (!prev.includes(type)) return [...prev, type];
        return prev;
      });
      setPendingSkills((prev) => {
        const skill = prev.find((s) => s.id === skillId);
        if (skill) {
          const newIdx = skill[type].length - 1;
          setTimeout(() => {
            setFlashItem(`${type}_${newIdx}`);
            const el = document.getElementById(`skill-${skillId}-${type}-${newIdx}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 50);
        }
        return prev;
      });
    },
    []
  );

  const handleRemoveInstance = useCallback(
    (
      skillId: string,
      type: "conditions" | "costs" | "effects",
      index: number
    ) => {
      setPendingSkills((prev) =>
        prev.map((s) => {
          if (s.id !== skillId) return s;
          const arr = [...s[type]];
          arr.splice(index, 1);
          return { ...s, [type]: arr, updatedAt: Date.now() };
        })
      );
    },
    []
  );

  useEffect(() => {
    if (!flashItem) return;
    const timer = setTimeout(() => setFlashItem(null), 1800);
    return () => clearTimeout(timer);
  }, [flashItem]);

  const handleInstanceParamChange = useCallback(
    (
      skillId: string,
      type: "conditions" | "costs" | "effects",
      index: number,
      key: string,
      value: unknown
    ) => {
      const topLevelKeys = [
        "conditionId", "costId", "effectId", "params",
        "logic", "timing", "stacking", "target",
        "inheritTarget", "saveAsInherit", "limit"
      ];
      const isTopLevel = topLevelKeys.includes(key);

      setPendingSkills((prev) =>
        prev.map((s) => {
          if (s.id !== skillId) return s;
          const arr = [...s[type]] as unknown as Record<string, unknown>[];
          if (arr[index]) {
            arr[index] = {
              ...arr[index],
              ...(isTopLevel
                ? { [key]: value }
                : { params: { ...((arr[index] as Record<string, unknown>).params || {}), [key]: value } }),
            };
          }
          return { ...s, [type]: arr, updatedAt: Date.now() };
        })
      );
    },
    []
  );

  const handleApply = useCallback(() => {
    if (!currentCard) return;
    const idx = Number(activeSkillIdx);
    const updatedSkills = pendingSkills.map((s, i) => {
      if (i === idx) {
        return { ...s, fiveSegmentEffects: pendingFiveSegment };
      }
      return s;
    });
    updateAllSkills(updatedSkills as ISkill[] & { fiveSegmentEffects?: IFiveSegmentEffect[] }[]);
  }, [currentCard, pendingSkills, pendingFiveSegment, activeSkillIdx, updateAllSkills]);

  const handleAddSkill = useCallback(() => {
    const now = Date.now();
    const newSkill: ISkill = {
      id: generateId("skill"),
      version: "1.0",
      createdAt: now,
      updatedAt: now,
      name: "新技能",
      description: "",
      conditions: [],
      costs: [],
      effects: [],
      cooldown: 0,
      useLimit: 0,
      isPassive: false,
    };
    addSkill(newSkill);
    setPendingSkills((prev) => [...prev, newSkill]);
    setActiveSkillIdx(String(pendingSkills.length));
  }, [addSkill, pendingSkills.length]);

  const handleRemoveSkill = useCallback(
    (skillId: string) => {
      removeSkill(skillId);
      setPendingSkills((prev) => prev.filter((s) => s.id !== skillId));
      setActiveSkillIdx("0");
    },
    [removeSkill]
  );

  // ─── 五段式操作 ────────────────────────────────────────

  const handleAddFiveSegmentRow = useCallback(() => {
    const newRow: IFiveSegmentEffect = {
      id: generateId("fseg"),
      level: "L1" as EffectLevel,
      sortOrder: pendingFiveSegment.length,
      condition: "",
      subject: SubjectType.SELF,
      predicate: PredicateType.DEAL,
      object: "",
      note: "",
      noteCategory: undefined,
      parentId: undefined,
      isAutoSplit: false,
    };
    setPendingFiveSegment((prev) => {
      const updated = [...prev, newRow];
      return updated.map((item, i) => ({ ...item, sortOrder: i }));
    });
  }, [pendingFiveSegment.length]);

  const handleDeleteFiveSegmentRow = useCallback((id: string) => {
    setPendingFiveSegment((prev) => {
      // 如果是父行，一并删除子行
      const idsToRemove = new Set<string>([id]);
      const hasChildren = prev.some((r) => r.parentId === id);
      if (hasChildren) {
        const collectChildren = (parentId: string) => {
          prev.forEach((r) => {
            if (r.parentId === parentId) {
              idsToRemove.add(r.id);
              collectChildren(r.id);
            }
          });
        };
        collectChildren(id);
      }
      const filtered = prev.filter((r) => !idsToRemove.has(r.id));
      return filtered.map((item, i) => ({ ...item, sortOrder: i }));
    });
  }, []);

  const handleMoveFiveSegmentRow = useCallback((id: string, direction: "up" | "down") => {
    setPendingFiveSegment((prev) => {
      const sorted = [...prev].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;

      // 交换 sortOrder
      const temp = sorted[idx].sortOrder;
      sorted[idx] = { ...sorted[idx], sortOrder: sorted[swapIdx].sortOrder };
      sorted[swapIdx] = { ...sorted[swapIdx], sortOrder: temp };

      return sorted.sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }, []);

  const handleAddChildRow = useCallback((parentId: string, currentLevel: EffectLevel) => {
    setPendingFiveSegment((prev) => {
      const parent = prev.find((r) => r.id === parentId);
      if (!parent) return prev;
      const childLevel = currentLevel === EffectLevel.L1 ? EffectLevel.L2 : EffectLevel.L3;
      const maxSortOrder = Math.max(...prev.map((r) => r.sortOrder), -1);
      const newRow: IFiveSegmentEffect = {
        id: generateId("fseg"),
        level: childLevel,
        sortOrder: maxSortOrder + 1,
        condition: "—",
        subject: SubjectType.SELF,
        predicate: PredicateType.DEAL,
        object: "",
        note: "",
        noteCategory: undefined,
        parentId: parentId,
        isAutoSplit: false,
      };
      const updated = [...prev, newRow];
      return updated.sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }, []);

  const handleFiveSegmentFieldChange = useCallback((id: string, field: string, value: unknown) => {
    setPendingFiveSegment((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }, []);

  // ─── 五段式 Table columns ──────────────────────────────

  const fiveSegmentColumns = useMemo(() => {
    const columns: ColumnsType<IFiveSegmentEffect> = [
      {
        title: "#",
        dataIndex: "sortOrder",
        key: "sortOrder",
        width: 50,
        render: (_: unknown, record: IFiveSegmentEffect) => {
          const levelIndent =
            record.level === "L2" ? 20 : record.level === "L3" ? 40 : 0;
          return (
            <span style={{ paddingLeft: levelIndent, display: "inline-block" }}>
              {record.sortOrder}
            </span>
          );
        },
      },
      {
        title: "层级",
        dataIndex: "level",
        key: "level",
        width: 80,
        render: (value: EffectLevel, record: IFiveSegmentEffect) => {
          const levelIndent =
            record.level === "L2" ? 20 : record.level === "L3" ? 40 : 0;
          return (
            <Select
              size="small"
              style={{ width: 65, marginLeft: levelIndent }}
              value={value}
              options={EFFECT_LEVEL_OPTIONS}
              onChange={(v) => handleFiveSegmentFieldChange(record.id, "level", v)}
            />
          );
        },
      },
      {
        title: "条件",
        dataIndex: "condition",
        key: "condition",
        width: 200,
        render: (value: string, record: IFiveSegmentEffect) => (
          <div>
            <Select
              size="small"
              style={{ width: "100%", marginBottom: 4 }}
              value="__free__"
              popupMatchSelectWidth={false}
              options={COND_TEMPLATE_OPTIONS}
              onChange={(v) => {
                if (v === "__free__") return;
                const tpl = FIVESEG_CONDITION_TEMPLATES.find((t) => t.id === v);
                if (tpl) {
                  handleFiveSegmentFieldChange(record.id, "condition", tpl.template);
                }
              }}
            />
            <AutoComplete
              size="small"
              style={{ width: "100%" }}
              value={value}
              options={COND_AUTOCOMPLETE_OPTIONS}
              onChange={(v) => handleFiveSegmentFieldChange(record.id, "condition", v)}
            >
              <Input size="small" placeholder="输入条件文本" />
            </AutoComplete>
          </div>
        ),
      },
      {
        title: "主语",
        dataIndex: "subject",
        key: "subject",
        width: 120,
        render: (value: SubjectType, record: IFiveSegmentEffect) => (
          <Select
            size="small"
            style={{ width: "100%" }}
            value={value}
            options={SUBJECT_OPTIONS}
            onChange={(v) => handleFiveSegmentFieldChange(record.id, "subject", v)}
          />
        ),
      },
      {
        title: "谓语",
        dataIndex: "predicate",
        key: "predicate",
        width: 120,
        render: (value: PredicateType, record: IFiveSegmentEffect) => (
          <Select
            size="small"
            style={{ width: "100%" }}
            value={value}
            optionFilterProp="label"
            onChange={(v) => handleFiveSegmentFieldChange(record.id, "predicate", v)}
          >
            {FIVESEG_PREDICATE_GROUPS.map((group) => (
              <OptGroup key={group.groupName} label={group.groupName}>
                {group.predicates.map((pred) => (
                  <Option key={pred} value={pred} label={(PREDICATE_LABELS as Record<string, string>)[pred] ?? pred}>
                    {(PREDICATE_LABELS as Record<string, string>)[pred] ?? pred}
                  </Option>
                ))}
              </OptGroup>
            ))}
          </Select>
        ),
      },
      {
        title: "宾语",
        dataIndex: "object",
        key: "object",
        width: 200,
        render: (value: string, record: IFiveSegmentEffect) => (
          <div>
            <Select
              size="small"
              style={{ width: "100%", marginBottom: 4 }}
              value="__free__"
              popupMatchSelectWidth={false}
              options={OBJECT_TEMPLATE_OPTIONS}
              onChange={(v) => {
                if (v === "__free__") return;
                const tpl = FIVESEG_OBJECT_TEMPLATES.find((t) => t.id === v);
                if (tpl) {
                  handleFiveSegmentFieldChange(record.id, "object", tpl.template);
                }
              }}
            />
            <AutoComplete
              size="small"
              style={{ width: "100%" }}
              value={value}
              options={OBJECT_AUTOCOMPLETE_OPTIONS}
              onChange={(v) => handleFiveSegmentFieldChange(record.id, "object", v)}
            >
              <Input size="small" placeholder="输入宾语文本" />
            </AutoComplete>
          </div>
        ),
      },
      {
        title: "备注",
        dataIndex: "note",
        key: "note",
        width: 140,
        render: (_: unknown, record: IFiveSegmentEffect) => (
          <Space size={4} style={{ width: "100%" }}>
            <Input
              size="small"
              style={{ width: 80 }}
              value={record.note}
              placeholder="备注"
              onChange={(e) => handleFiveSegmentFieldChange(record.id, "note", e.target.value)}
            />
            <Select
              size="small"
              style={{ width: 90 }}
              value={record.noteCategory || undefined}
              placeholder="分类"
              allowClear
              options={NOTE_CATEGORY_OPTIONS}
              onChange={(v) => handleFiveSegmentFieldChange(record.id, "noteCategory", v)}
            />
          </Space>
        ),
      },
      {
        title: "操作",
        key: "actions",
        width: 160,
        render: (_: unknown, record: IFiveSegmentEffect) => {
          const isFirst = record.sortOrder === 0;
          const sorted = [...pendingFiveSegment].sort((a, b) => a.sortOrder - b.sortOrder);
          const isLast = sorted[sorted.length - 1]?.id === record.id;
          const canAddChild = record.level === "L1" || record.level === "L2";

          return (
            <Space size={2}>
              <Button
                size="small"
                type="text"
                icon={<ArrowUpOutlined />}
                disabled={isFirst}
                onClick={() => handleMoveFiveSegmentRow(record.id, "up")}
              />
              <Button
                size="small"
                type="text"
                icon={<ArrowDownOutlined />}
                disabled={isLast}
                onClick={() => handleMoveFiveSegmentRow(record.id, "down")}
              />
              {canAddChild && (
                <Button
                  size="small"
                  type="text"
                  style={{ color: "#1890ff" }}
                  onClick={() => handleAddChildRow(record.id, record.level)}
                >
                  ＋子项
                </Button>
              )}
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteFiveSegmentRow(record.id)}
              />
            </Space>
          );
        },
      },
    ];
    return columns;
  }, [
    pendingFiveSegment,
    handleFiveSegmentFieldChange,
    handleMoveFiveSegmentRow,
    handleAddChildRow,
    handleDeleteFiveSegmentRow,
  ]);

  // 构建预览卡牌
  const previewCard = useMemo(() => {
    if (!currentCard) return null;
    return {
      ...currentCard,
      skills: pendingSkills,
    };
  }, [currentCard, pendingSkills]);

  const description = previewCard ? generateCardDescription(previewCard) : "";

  if (!currentCard) {
    return <Empty description="请先选择卡牌类型" />;
  }

  // 排序后的五段式数据源
  const fiveSegmentDataSource = [...pendingFiveSegment].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const tabItems = pendingSkills.map((skill, idx) => ({
    key: String(idx),
    label: (
      <span>
        {skill.name || `技能 ${idx + 1}`}
        {pendingSkills.length > 1 && (
          <Popconfirm
            title="确定删除此技能？"
            onConfirm={() => handleRemoveSkill(skill.id)}
          >
            <DeleteOutlined style={{ marginLeft: 8, color: "#ff4d4f", cursor: "pointer" }} />
          </Popconfirm>
        )}
      </span>
    ),
    children: (
      <div style={{ padding: "0 4px" }}>
        {/* 技能基本信息 + 模式切换 */}
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <div>
                <Text style={{ marginRight: 8 }}>技能名称</Text>
                <Input
                  style={{ width: 200 }}
                  value={skill.name}
                  onChange={(e) => handleSkillChange(skill.id, { name: e.target.value })}
                />
              </div>
              <div>
                <Text style={{ marginRight: 8 }}>被动技能</Text>
                <Switch
                  checked={skill.isPassive}
                  onChange={(v) => handleSkillChange(skill.id, { isPassive: v })}
                />
              </div>
              <div>
                <Text style={{ marginRight: 8 }}>冷却</Text>
                <InputNumber
                  min={0}
                  max={99}
                  value={skill.cooldown}
                  onChange={(v) => handleSkillChange(skill.id, { cooldown: v ?? 0 })}
                />
              </div>
              <div>
                <Text style={{ marginRight: 8 }}>使用次数</Text>
                <InputNumber
                  min={0}
                  max={99}
                  value={skill.useLimit}
                  onChange={(v) => handleSkillChange(skill.id, { useLimit: v ?? 0 })}
                />
              </div>
            </Space>
            <Space>
              <Text>五段式</Text>
              <Switch
                checked={editMode === "five_segment"}
                onChange={(v) => setEditMode(v ? "five_segment" : "template")}
              />
              <Text>模板式</Text>
            </Space>
          </Space>
        </Space>

        {/* 五段式编辑 */}
        {editMode === "five_segment" && (
          <div>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddFiveSegmentRow}
              style={{ marginBottom: 12 }}
            >
              添加效果行
            </Button>

            <Table
              dataSource={fiveSegmentDataSource}
              columns={fiveSegmentColumns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 990 }}
              onRow={(record: IFiveSegmentEffect) => ({
                style: {
                  backgroundColor:
                    record.level === "L2" || record.level === "L3" ? "#fafafa" : undefined,
                },
              })}
            />

            {/* 语法校验结果 */}
            {validationResult && (
              <>
                {validationResult.errors.length > 0 && (
                  <Alert
                    type="error"
                    message={`语法校验未通过（${validationResult.errors.length} 项错误）`}
                    description={
                      <div>
                        {validationResult.errors.map((msg: IValidationMessage, i: number) => (
                          <div key={`err-${i}`} style={{ marginBottom: 4 }}>
                            <Tag color="red">{msg.ruleId}</Tag>
                            <span>{msg.message}</span>
                          </div>
                        ))}
                      </div>
                    }
                    style={{ marginTop: 12, marginBottom: 0 }}
                    showIcon
                  />
                )}
                {validationResult.warnings.length > 0 && (
                  <Alert
                    type="warning"
                    message={`语法校验提示（${validationResult.warnings.length} 项警告）`}
                    description={
                      <div>
                        {validationResult.warnings.map((msg: IValidationMessage, i: number) => (
                          <div key={`warn-${i}`} style={{ marginBottom: 4 }}>
                            <Tag color="orange">{msg.ruleId}</Tag>
                            <span>{msg.message}</span>
                          </div>
                        ))}
                      </div>
                    }
                    style={{ marginTop: 12, marginBottom: 0 }}
                    showIcon
                  />
                )}
                {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                  <Alert
                    type="success"
                    message="语法校验通过"
                    style={{ marginTop: 12, marginBottom: 0 }}
                    showIcon
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* 模板式编辑（旧 Collapse） */}
        {editMode === "template" && (
          <Collapse
            activeKey={collapseActiveKeys}
            onChange={(keys) => setCollapseActiveKeys(keys as string[])}
            items={[
              {
                key: "conditions",
                label: `条件（${skill.conditions.length}）`,
                children: (
                  <div>
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const firstId = Object.keys(conditionTemplates)[0] || "";
                        handleAddInstance(skill.id, "conditions", {
                          conditionId: firstId,
                          params: {},
                          logic: LogicOperator.AND,
                        });
                      }}
                      style={{ marginBottom: 12 }}
                    >
                      添加条件
                    </Button>

                    {skill.conditions.map((cond, cIdx) => (
                      <Card
                        key={cIdx}
                        id={`skill-${skill.id}-conditions-${cIdx}`}
                        size="small"
                        style={{
                          marginBottom: 8,
                          ...(flashItem === `conditions_${cIdx}`
                            ? {
                                boxShadow: "0 0 12px rgba(24,144,255,0.6)",
                                borderColor: "#1890ff",
                                transition: "box-shadow 0.5s, border-color 0.5s",
                              }
                            : {
                                transition: "box-shadow 0.8s, border-color 0.8s",
                              }),
                        }}
                        extra={
                          <DeleteOutlined
                            style={{ color: "#ff4d4f", cursor: "pointer" }}
                            onClick={() => handleRemoveInstance(skill.id, "conditions", cIdx)}
                          />
                        }
                      >
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <Space wrap>
                            <div>
                              <Text style={{ marginRight: 8 }}>条件类型</Text>
                              <Select
                                style={{ width: 200 }}
                                value={cond.conditionId}
                                options={Object.entries(conditionTemplates).map(([id, tpl]) => ({
                                  value: id,
                                  label: tpl.name,
                                }))}
                                onChange={(v) =>
                                  handleInstanceParamChange(skill.id, "conditions", cIdx, "conditionId", v)
                                }
                              />
                            </div>
                            <div>
                              <Text style={{ marginRight: 8 }}>逻辑</Text>
                              <Select
                                style={{ width: 100 }}
                                value={cond.logic || LogicOperator.AND}
                                options={LOGIC_OPTIONS}
                                onChange={(v) =>
                                  handleInstanceParamChange(skill.id, "conditions", cIdx, "logic", v)
                                }
                              />
                            </div>
                          </Space>

                          <div>
                            <Text style={{ marginRight: 8, fontSize: 12 }}>检定目标</Text>
                            <Select
                              style={{ width: 200 }}
                              placeholder="选择检定目标（默认自身）"
                              allowClear
                              value={cond.target || undefined}
                              options={TARGET_OPTIONS}
                              onChange={(v) =>
                                handleInstanceParamChange(skill.id, "conditions", cIdx, "target", v)
                              }
                            />
                          </div>

                          {cond.conditionId &&
                            conditionTemplates[cond.conditionId]?.params.map((param) => (
                              <div key={param.key}>
                                <Text style={{ marginRight: 8, fontSize: 12 }}>{param.label}</Text>
                                {renderParamInput(
                                  param,
                                  cond.params[param.key],
                                  (key, val) =>
                                    handleInstanceParamChange(skill.id, "conditions", cIdx, key, val)
                                )}
                              </div>
                            ))}
                        </Space>
                      </Card>
                    ))}
                  </div>
                ),
              },
              {
                key: "costs",
                label: `消耗（${skill.costs.length}）`,
                children: (
                  <div>
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const firstId = Object.keys(costTemplates)[0] || "";
                        handleAddInstance(skill.id, "costs", {
                          costId: firstId,
                          params: {},
                        });
                      }}
                      style={{ marginBottom: 12 }}
                    >
                      添加消耗
                    </Button>

                    {skill.costs.map((cost, cIdx) => (
                      <Card
                        key={cIdx}
                        id={`skill-${skill.id}-costs-${cIdx}`}
                        size="small"
                        style={{
                          marginBottom: 8,
                          ...(flashItem === `costs_${cIdx}`
                            ? {
                                boxShadow: "0 0 12px rgba(24,144,255,0.6)",
                                borderColor: "#1890ff",
                                transition: "box-shadow 0.5s, border-color 0.5s",
                              }
                            : {
                                transition: "box-shadow 0.8s, border-color 0.8s",
                              }),
                        }}
                        extra={
                          <DeleteOutlined
                            style={{ color: "#ff4d4f", cursor: "pointer" }}
                            onClick={() => handleRemoveInstance(skill.id, "costs", cIdx)}
                          />
                        }
                      >
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <div>
                            <Text style={{ marginRight: 8 }}>消耗类型</Text>
                            <Select
                              style={{ width: 200 }}
                              value={cost.costId}
                              options={Object.entries(costTemplates).map(([id, tpl]) => ({
                                value: id,
                                label: tpl.name,
                              }))}
                              onChange={(v) =>
                                handleInstanceParamChange(skill.id, "costs", cIdx, "costId", v)
                              }
                            />
                          </div>

                          {cost.costId &&
                            costTemplates[cost.costId]?.params.map((param) => (
                              <div key={param.key}>
                                <Text style={{ marginRight: 8, fontSize: 12 }}>{param.label}</Text>
                                {renderParamInput(
                                  param,
                                  cost.params[param.key],
                                  (key, val) =>
                                    handleInstanceParamChange(skill.id, "costs", cIdx, key, val)
                                )}
                              </div>
                            ))}
                        </Space>
                      </Card>
                    ))}
                  </div>
                ),
              },
              {
                key: "effects",
                label: `效果（${skill.effects.length}）`,
                children: (
                  <div>
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const firstId = Object.keys(effectTemplates)[0] || "";
                        handleAddInstance(skill.id, "effects", {
                          effectId: firstId,
                          params: {},
                          timing: Timing.IMMEDIATE,
                          stacking: StackingType.REPLACE,
                          target: TargetType.SELF,
                        });
                      }}
                      style={{ marginBottom: 12 }}
                    >
                      添加效果
                    </Button>

                    {skill.effects.map((eff, eIdx) => (
                      <Card
                        key={eIdx}
                        id={`skill-${skill.id}-effects-${eIdx}`}
                        size="small"
                        style={{
                          marginBottom: 8,
                          ...(flashItem === `effects_${eIdx}`
                            ? {
                                boxShadow: "0 0 12px rgba(24,144,255,0.6)",
                                borderColor: "#1890ff",
                                transition: "box-shadow 0.5s, border-color 0.5s",
                              }
                            : {
                                transition: "box-shadow 0.8s, border-color 0.8s",
                              }),
                        }}
                        extra={
                          <DeleteOutlined
                            style={{ color: "#ff4d4f", cursor: "pointer" }}
                            onClick={() => handleRemoveInstance(skill.id, "effects", eIdx)}
                          />
                        }
                      >
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <Space wrap>
                            <div>
                              <Text style={{ marginRight: 8 }}>效果类型</Text>
                              <Select
                                style={{ width: 200 }}
                                value={eff.effectId}
                                options={Object.entries(effectTemplates).map(([id, tpl]) => ({
                                  value: id,
                                  label: tpl.name,
                                }))}
                                onChange={(v) =>
                                  handleInstanceParamChange(skill.id, "effects", eIdx, "effectId", v)
                                }
                              />
                            </div>
                            <div>
                              <Text style={{ marginRight: 8 }}>时机</Text>
                              <Select
                                style={{ width: 160 }}
                                value={eff.timing}
                                options={TIMING_OPTIONS}
                                onChange={(v) =>
                                  handleInstanceParamChange(skill.id, "effects", eIdx, "timing", v)
                                }
                              />
                            </div>
                            <div>
                              <Text style={{ marginRight: 8 }}>叠加</Text>
                              <Select
                                style={{ width: 120 }}
                                value={eff.stacking}
                                options={STACKING_OPTIONS}
                                onChange={(v) =>
                                  handleInstanceParamChange(skill.id, "effects", eIdx, "stacking", v)
                                }
                              />
                            </div>
                          </Space>

                          <Space wrap>
                            <div>
                              <Text style={{ marginRight: 8 }}>目标</Text>
                              <Select
                                style={{ width: 200 }}
                                value={eff.target}
                                options={TARGET_OPTIONS}
                                onChange={(v) =>
                                  handleInstanceParamChange(skill.id, "effects", eIdx, "target", v)
                                }
                              />
                            </div>
                            {!isBasic && (
                              <>
                                <div>
                                  <Text style={{ marginRight: 8 }}>承接主体</Text>
                                  <Input
                                    style={{ width: 150 }}
                                    placeholder="承接主体 key"
                                    value={eff.inheritTarget || ""}
                                    onChange={(e) =>
                                      handleInstanceParamChange(
                                        skill.id,
                                        "effects",
                                        eIdx,
                                        "inheritTarget",
                                        e.target.value || undefined
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <Text style={{ marginRight: 8 }}>保存为承接</Text>
                                  <Input
                                    style={{ width: 150 }}
                                    placeholder="保存为承接主体 key"
                                    value={eff.saveAsInherit || ""}
                                    onChange={(e) =>
                                      handleInstanceParamChange(
                                        skill.id,
                                        "effects",
                                        eIdx,
                                        "saveAsInherit",
                                        e.target.value || undefined
                                      )
                                    }
                                  />
                                </div>
                              </>
                            )}
                          </Space>

                          {eff.effectId &&
                            effectTemplates[eff.effectId]?.params.map((param) => (
                              <div key={param.key}>
                                <Text style={{ marginRight: 8, fontSize: 12 }}>{param.label}</Text>
                                {renderParamInput(
                                  param,
                                  eff.params[param.key],
                                  (key, val) =>
                                    handleInstanceParamChange(skill.id, "effects", eIdx, key, val)
                                )}
                              </div>
                            ))}
                        </Space>
                      </Card>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>
    ),
  }));

  // Add tab for adding new skill
  if (pendingSkills.length < maxSkills) {
    tabItems.push({
      key: "__add__",
      label: <PlusOutlined style={{ cursor: "pointer" }} />,
      children: <></>,
    });
  }

  return (
    <div>
      <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
        配置技能效果
      </Title>

      <Tabs
        activeKey={activeSkillIdx}
        onChange={(key) => {
          if (key === "__add__") {
            handleAddSkill();
          } else {
            setActiveSkillIdx(key);
          }
        }}
        items={tabItems}
        tabBarExtraContent={
          <Button type="primary" onClick={handleApply}>
            应用
          </Button>
        }
      />

      {/* 实时效果描述预览 */}
      {description && (
        <Card
          size="small"
          title="效果描述预览"
          style={{ marginTop: 16, background: "#f6ffed" }}
        >
          <Paragraph style={{ whiteSpace: "pre-line", margin: 0, fontSize: 13 }}>
            {description}
          </Paragraph>
        </Card>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Space>
          <Button size="large" onClick={onPrev}>
            上一步
          </Button>
          <Button type="primary" size="large" onClick={() => { handleApply(); onNext(); }}>
            下一步
          </Button>
        </Space>
      </div>
    </div>
  );
}

export default Step3_EffectEdit;
