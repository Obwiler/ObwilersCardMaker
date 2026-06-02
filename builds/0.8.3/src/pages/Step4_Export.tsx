import { useState, useRef } from "react";
import {
  Button,
  Space,
  Typography,
  message,
  Input,
  Row,
  Col,
} from "antd";
import { CopyOutlined, ExportOutlined, FileImageOutlined, FileAddOutlined } from "@ant-design/icons";
import { toPng } from "html-to-image";
import { CardPreview } from "@/components";
import { useCardStore } from "@/store";
import { exportToJSON } from "@/utils/exporters";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

const { Text, Title } = Typography;

interface Step4Props {
  onPrev: () => void;
}

function Step4_Export({ onPrev }: Step4Props) {
  const currentCard = useCardStore((s) => s.currentCard);
  const resetCard = useCardStore((s) => s.resetCard);
  const previewRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const jsonStr = currentCard ? exportToJSON(currentCard) : "{}";
  const jsonLines = jsonStr.split("\n");
  const jsonPreview = jsonLines.slice(0, 20).join("\n");

  /** 使用 Tauri 原生保存对话框写入 JSON 文件 */
  const handleExportJSON = async () => {
    if (!currentCard) return;
    try {
      const filePath = await save({
        defaultPath: `${currentCard.name || "card"}.json`,
        filters: [{ name: "JSON 文件", extensions: ["json"] }],
        title: "保存卡牌 JSON",
      });
      if (!filePath) return; // 用户取消
      await invoke("save_card_data", { path: filePath, content: jsonStr });
      message.success("JSON 已保存");
    } catch (e: any) {
      message.error(`保存失败：${e?.message || e}`);
    }
  };

  const handleCopyJSON = async () => {
    try {
      await navigator.clipboard.writeText(jsonStr);
      message.success("JSON 已复制到剪贴板");
    } catch {
      message.error("复制失败");
    }
  };

  const handleExportPNG = async () => {
    if (!previewRef.current || !currentCard) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1,
        pixelRatio: 3,
      });
      // dataUrl 格式: "data:image/png;base64,xxxxx"
      const base64 = dataUrl.split(",")[1];
      if (!base64) throw new Error("无效的图片数据");

      const filePath = await save({
        defaultPath: `${currentCard.name || "card"}.png`,
        filters: [{ name: "PNG 图片", extensions: ["png"] }],
        title: "导出卡牌 PNG",
      });
      if (!filePath) return; // 用户取消

      await invoke("save_card_image", { path: filePath, dataBase64: base64 });
      message.success("PNG 已导出");
    } catch (e: any) {
      message.error(`PNG 导出失败：${e?.message || e}`);
    } finally {
      setExporting(false);
    }
  };

  const handleNewCard = () => {
    resetCard();
    message.success("已重置，可以创建新卡牌");
  };

  return (
    <div>
      <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
        预览与导出
      </Title>

      <Row gutter={24}>
        <Col xs={24} md={14}>
          <div ref={previewRef}>
            <CardPreview card={currentCard} />
          </div>
        </Col>

        <Col xs={24} md={10}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Button
              type="primary"
              icon={<ExportOutlined />}
              block
              size="large"
              onClick={handleExportJSON}
              disabled={!currentCard}
            >
              保存 JSON 到文件
            </Button>

            <Button
              icon={<CopyOutlined />}
              block
              onClick={handleCopyJSON}
              disabled={!currentCard}
            >
              复制 JSON
            </Button>

            <div>
              <Text strong>JSON 预览（前 20 行）</Text>
              <Input.TextArea
                value={jsonPreview}
                readOnly
                rows={12}
                style={{ fontFamily: "monospace", fontSize: 11, marginTop: 8 }}
              />
            </div>

            <Button
              icon={<FileImageOutlined />}
              block
              loading={exporting}
              onClick={handleExportPNG}
              disabled={!currentCard}
            >
              导出 PNG 图片
            </Button>

            <Button
              icon={<FileAddOutlined />}
              block
              type="dashed"
              onClick={handleNewCard}
            >
              新建卡牌
            </Button>
          </Space>
        </Col>
      </Row>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Button size="large" onClick={onPrev}>
          上一步
        </Button>
      </div>
    </div>
  );
}

export default Step4_Export;
