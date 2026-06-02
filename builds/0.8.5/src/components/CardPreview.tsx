import { Card, Tag, Empty, Space, Typography, Descriptions } from "antd";
import {
  RARITY_COLORS,
  RARITY_LABELS,
  CARD_TYPE_LABELS,
  ATTRIBUTE_LABELS,
  AttributeType,
} from "@/atomic";
import type { ICard } from "@/atomic";
import { formatEffect } from "@/utils/exporters";

const { Text, Title } = Typography;

interface CardPreviewProps {
  card: ICard | null;
}

/** 归一化 cardTextColor：ColorPicker 可能存为对象，转为 CSS 字符串 */
function normalizeColor(color: unknown): string | undefined {
  if (!color) return undefined;
  if (typeof color === "string") return color;
  if (typeof color === "object") {
    const c = color as { toHexString?: () => string };
    if (typeof c.toHexString === "function") return c.toHexString();
  }
  return undefined;
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

  const fontFamily = card.cardFontFamily || "Microsoft YaHei";
  const fontSize = card.cardFontSize ?? 16;
  const textColor = normalizeColor(card.cardTextColor) || "#000000";

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
      <Title level={4} style={{ margin: 0, color: textColor, fontFamily, fontSize: fontSize + 4 }}>
        {card.displayName || card.name || "未命名"}
      </Title>

      {/* 品质 */}
      <div style={{ marginBottom: 8 }}>
        <Tag
          color={card.rarity}
          style={{ color: textColor, borderColor: rarityColor.border }}
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
                <Text strong style={{ color: textColor, fontFamily, fontSize: Math.max(12, fontSize - 2) }}>
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
                {skill.description && (
                  <div style={{ fontSize: Math.max(10, fontSize - 4), paddingLeft: 8, color: textColor, opacity: 0.75, fontFamily, marginTop: 2 }}>
                    {skill.description}
                  </div>
                )}
                {skill.effects.map((eff, eIdx) => (
                  <div key={eIdx} style={{ fontSize: Math.max(10, fontSize - 4), paddingLeft: 8, color: textColor, opacity: 0.85, fontFamily }}>
                    {formatEffect(eff)}
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
            <Descriptions.Item key={key} label={ATTRIBUTE_LABELS[key as AttributeType] ?? key} labelStyle={{ color: textColor, fontFamily, fontSize: Math.max(10, fontSize - 4) }}>
              <Text style={{ color: textColor, fontFamily, fontSize: Math.max(10, fontSize - 4) }}>{val}</Text>
            </Descriptions.Item>
          ))}
        </Descriptions>
      )}

      {/* 卡牌描述 */}
      {card.description && (
        <div style={{ marginTop: 4, fontSize: Math.max(10, fontSize - 4), color: textColor, opacity: 0.6, fontFamily, lineHeight: 1.3 }}>
          {card.description}
        </div>
      )}

      {/* 标签列表 */}
      {card.tags && card.tags.length > 0 && (
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
