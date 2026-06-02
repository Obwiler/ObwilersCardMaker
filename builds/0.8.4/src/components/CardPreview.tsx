import { Card, Tag, Empty, Space, Typography, Descriptions } from "antd";
import {
  RARITY_COLORS,
  RARITY_LABELS,
  CARD_TYPE_LABELS,
  ATTRIBUTE_LABELS,
  AttributeType,
} from "@/atomic";
import type { ICard } from "@/atomic";
import { getEffectTemplate } from "@/templates";
import type { IEffectInstance } from "@/atomic";

const { Text, Title } = Typography;

interface CardPreviewProps {
  card: ICard | null;
}

function renderEffectDescription(effect: IEffectInstance): string {
  const template = getEffectTemplate(effect.effectId as never);
  if (!template) return effect.effectId;

  const parts: string[] = [template.name];
  for (const param of template.params) {
    const val = effect.params[param.key];
    if (val !== undefined && val !== null) {
      parts.push(`${param.label}:${val}`);
    }
  }
  return parts.join(" ");
}

function CardPreview({ card }: CardPreviewProps) {
  if (!card) {
    return (
      <Card
        style={{ width: 360, height: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
        styles={{ body: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" } }}
      >
        <Empty description="暂无卡牌数据" />
      </Card>
    );
  }

  const rarityColor = card.rarity
    ? RARITY_COLORS[card.rarity]
    : RARITY_COLORS.white;

  const nonZeroStats = Object.entries(card.baseStats || {}).filter(
    ([, v]) => v !== 0 && v !== undefined
  );

  return (
    <Card
      style={{
        width: 360,
        height: 500,
        background: rarityColor.background,
        borderColor: rarityColor.border,
        borderWidth: 2,
        borderRadius: 16,
        overflow: "hidden",
      }}
      styles={{
        body: {
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          color: rarityColor.text,
        },
      }}
    >
      {/* 类型标签 */}
      <div style={{ marginBottom: 8 }}>
        <Tag color="blue">{CARD_TYPE_LABELS[card.type]}</Tag>
      </div>

      {/* 名称 */}
      <Title level={4} style={{ margin: 0, color: rarityColor.text }}>
        {card.displayName || card.name || "未命名"}
      </Title>

      {/* 品质 */}
      <div style={{ marginBottom: 8 }}>
        <Tag
          color={card.rarity}
          style={{ color: rarityColor.text, borderColor: rarityColor.border }}
        >
          {RARITY_LABELS[card.rarity]}
        </Tag>
      </div>

      {/* 技能列表 */}
      <div style={{ flex: 1, overflow: "auto", marginBottom: 8 }}>
        {card.skills.length > 0 ? (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            {card.skills.map((skill, idx) => (
              <div key={skill.id || idx}>
                <Text strong style={{ color: rarityColor.text, fontSize: 13 }}>
                  {skill.name || `技能 ${idx + 1}`}
                  {skill.cooldown > 0 && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {" "}
                      冷却{skill.cooldown}
                    </Text>
                  )}
                  {skill.useLimit > 0 && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {" "}
                      {skill.useLimit}次
                    </Text>
                  )}
                </Text>
                {skill.effects.map((eff, eIdx) => (
                  <div key={eIdx} style={{ fontSize: 11, paddingLeft: 8, color: rarityColor.text, opacity: 0.85 }}>
                    {renderEffectDescription(eff)}
                  </div>
                ))}
              </div>
            ))}
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>暂无技能</Text>
        )}
      </div>

      {/* 属性面板 */}
      {nonZeroStats.length > 0 && (
        <Descriptions size="small" column={2} colon={false}>
          {nonZeroStats.map(([key, val]) => (
            <Descriptions.Item key={key} label={ATTRIBUTE_LABELS[key as AttributeType] ?? key} labelStyle={{ color: rarityColor.text, fontSize: 11 }}>
              <Text style={{ color: rarityColor.text, fontSize: 11 }}>{val}</Text>
            </Descriptions.Item>
          ))}
        </Descriptions>
      )}

      {/* 标签列表 */}
      {card.tags.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {card.tags.map((t) => (
            <Tag key={t} style={{ fontSize: 10, marginBottom: 2 }}>
              {t}
            </Tag>
          ))}
        </div>
      )}
    </Card>
  );
}

export default CardPreview;
export type { CardPreviewProps };
