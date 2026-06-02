import { useEffect } from "react";
import {
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Space,
  Typography,
} from "antd";
import { CardType, Rarity, RARITY_LABELS, MAX_TAGS_PER_CARD, MAX_NAME_LENGTH } from "@/atomic";
import { useCardStore } from "@/store";

const { Title } = Typography;

const RARITY_OPTIONS = Object.values(Rarity).map((r) => ({
  value: r,
  label: RARITY_LABELS[r],
}));

interface Step2Props {
  onNext: () => void;
  onPrev: () => void;
}

function Step2_BasicInfo({ onNext, onPrev }: Step2Props) {
  const currentCard = useCardStore((s) => s.currentCard);
  const updateBasicInfo = useCardStore((s) => s.updateBasicInfo);
  const [form] = Form.useForm();

  const isBasic = currentCard?.type === CardType.BASIC;

  useEffect(() => {
    if (currentCard) {
      form.setFieldsValue({
        name: currentCard.name || "",
        displayName: currentCard.displayName || "",
        rarity: currentCard.rarity || Rarity.WHITE,
        tags: currentCard.tags || [],
        flavorText: currentCard.flavorText || "",
        description: currentCard.description || "",
        coolDown: currentCard.coolDown ?? 0,
        useLimit: currentCard.useLimit ?? 0,
      });
    }
  }, [currentCard, form]);

  const handleValuesChange = (
    _changedValues: Record<string, unknown>,
    allValues: Record<string, unknown>
  ) => {
    updateBasicInfo(allValues as never);
  };

  const handleNext = () => {
    form.validateFields().then(() => {
      onNext();
    });
  };

  return (
    <div>
      <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
        基本信息
      </Title>

      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 500, margin: "0 auto" }}
        onValuesChange={handleValuesChange}
      >
        <Form.Item
          name="name"
          label="卡牌内部名称"
          rules={[
            { required: true, message: "请输入卡牌内部名称" },
            { max: MAX_NAME_LENGTH, message: `最多 ${MAX_NAME_LENGTH} 个字符` },
          ]}
        >
          <Input placeholder="卡牌内部名称" maxLength={MAX_NAME_LENGTH} />
        </Form.Item>

        <Form.Item
          name="displayName"
          label="卡牌显示名称"
          rules={[
            { required: true, message: "请输入卡牌显示名称" },
            { max: MAX_NAME_LENGTH, message: `最多 ${MAX_NAME_LENGTH} 个字符` },
          ]}
        >
          <Input placeholder="卡牌显示名称" maxLength={MAX_NAME_LENGTH} />
        </Form.Item>

        {isBasic && (
          <Form.Item
            name="rarity"
            label="品质"
            rules={[{ required: true, message: "请选择品质" }]}
          >
            <Select options={RARITY_OPTIONS} />
          </Form.Item>
        )}

        <Form.Item
          name="tags"
          label="标签"
          rules={[
            {
              validator: (_, value: string[]) => {
                if (value && value.length > MAX_TAGS_PER_CARD) {
                  return Promise.reject(`最多 ${MAX_TAGS_PER_CARD} 个标签`);
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Select mode="tags" placeholder="输入标签后回车" maxCount={MAX_TAGS_PER_CARD} />
        </Form.Item>

        {isBasic && (
          <>
            <Form.Item name="flavorText" label="风味文本">
              <Input placeholder="风味文本" />
            </Form.Item>

            <Form.Item name="description" label="描述文本">
              <Input placeholder="描述文本" />
            </Form.Item>
          </>
        )}

        {!isBasic && (
          <>
            <Form.Item name="coolDown" label="冷却回合">
              <InputNumber min={0} max={99} placeholder="冷却回合" style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              name="useLimit"
              label="使用次数"
              extra="0 表示无限"
            >
              <InputNumber min={0} max={99} placeholder="使用次数" style={{ width: "100%" }} />
            </Form.Item>
          </>
        )}
      </Form>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Space>
          <Button size="large" onClick={onPrev}>
            上一步
          </Button>
          <Button type="primary" size="large" onClick={handleNext}>
            下一步
          </Button>
        </Space>
      </div>
    </div>
  );
}

export default Step2_BasicInfo;
