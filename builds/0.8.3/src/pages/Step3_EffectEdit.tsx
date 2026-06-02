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
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ISkill, IConditionInstance, ICostInstance, IEffectInstance } from "@/atomic";
import {
  AttributeType,
  Timing,
  StackingType,
  TargetType,
  LogicOperator,
  CardType,
  TIMING_LABELS,
  STACKING_LABELS,
  TARGET_TYPE_LABELS,
  LOGIC_LABELS,
  ATTRIBUTE_LABELS,
} from "@/atomic";
import {
  conditionTemplates,
  costTemplates,
  effectTemplates,
} from "@/templates";
import { generateCardDescription } from "@/utils/exporters";
import { markManager, useCardStore } from "@/store";
import { generateId } from "@/utils/helpers";

const { Text, Title, Paragraph } = Typography;

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

  const isBasic = currentCard?.type === CardType.BASIC;
  const maxSkills = isBasic ? 1 : 5;

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
      // 自动展开对应面板并高亮新项
      setCollapseActiveKeys((prev) => {
        if (!prev.includes(type)) return [...prev, type];
        return prev;
      });
      // 延迟设置 flashKey，等待 state 更新后拿到正确的 index
      setPendingSkills((prev) => {
        const skill = prev.find((s) => s.id === skillId);
        if (skill) {
          const newIdx = skill[type].length - 1;
          setTimeout(() => {
            setFlashItem(`${type}_${newIdx}`);
            // 滚动到新项
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

  // 高亮闪烁自动清除
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
      // 顶层键：不写入 params
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
    updateAllSkills(pendingSkills);
  }, [currentCard, pendingSkills, updateAllSkills]);

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

  // Build a card-like object for description preview
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
        {/* 技能基本信息 */}
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
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
        </Space>

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

                        {/* 目标选择（对所有条件开放） */}
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
