import { Card, Row, Col, Button, Typography } from "antd";
import { CARD_TYPE_LABELS, CardType } from "@/atomic";
import { useCardStore } from "@/store";

const { Title, Text } = Typography;

const TYPE_DESCRIPTIONS: Record<CardType, string> = {
  [CardType.BASIC]: "有品质系统，固定 1 个技能",
  [CardType.CAMP]: "无品质，支持冷却和次数",
  [CardType.CAREER]: "无品质，支持冷却和次数",
  [CardType.BUILD_WEAPON]: "无品质，支持冷却和次数",
  [CardType.BUILD_TREASURE]: "无品质，支持冷却和次数",
  [CardType.BUILD_ARMOR]: "无品质，支持冷却和次数",
  [CardType.BUILD_MARTIAL]: "无品质，支持冷却和次数",
  [CardType.BUILD_SPELL]: "无品质，支持冷却和次数",
};

interface Step1Props {
  onNext: () => void;
}

function Step1_CardType({ onNext }: Step1Props) {
  const currentCard = useCardStore((s) => s.currentCard);
  const setCardType = useCardStore((s) => s.setCardType);

  const selectedType = currentCard?.type ?? null;

  const handleSelect = (type: CardType) => {
    setCardType(type);
  };

  const cardTypes = Object.values(CardType);

  return (
    <div>
      <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
        选择卡牌类型
      </Title>

      <Row gutter={[16, 16]}>
        {cardTypes.map((type) => {
          const isSelected = selectedType === type;
          return (
            <Col key={type} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                onClick={() => handleSelect(type)}
                style={{
                  border: isSelected ? "2px solid #1677ff" : undefined,
                  cursor: "pointer",
                  textAlign: "center",
                  height: 120,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                styles={{
                  body: {
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    width: "100%",
                  },
                }}
              >
                <Title level={5} style={{ margin: 0 }}>
                  {CARD_TYPE_LABELS[type]}
                </Title>
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  {TYPE_DESCRIPTIONS[type]}
                </Text>
              </Card>
            </Col>
          );
        })}
      </Row>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Button
          type="primary"
          size="large"
          disabled={!selectedType}
          onClick={onNext}
        >
          下一步
        </Button>
      </div>
    </div>
  );
}

export default Step1_CardType;
