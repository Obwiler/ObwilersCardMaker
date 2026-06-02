// ============================================================
// CardMaker — Settings 设置页面 (0.9.0)
// ============================================================

import { useState, useCallback, useRef } from 'react';
import {
  Card,
  Collapse,
  Input,
  InputNumber,
  Select,
  Switch,
  Radio,
  Button,
  ColorPicker,
  Space,
  Divider,
  Popconfirm,
  message,
  Typography,
  Row,
  Col,
} from 'antd';
import type { Color } from 'antd/es/color-picker';
import {
  FolderOpenOutlined,
  UndoOutlined,
  ExportOutlined,
  ImportOutlined,
  SettingOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import type { IAppSettings } from '@/atomic';
import { DEFAULT_APP_SETTINGS } from '@/atomic';
import { configManager } from '@/store/configManager';

const { Text } = Typography;

/* ---------- 常量 ---------- */

const FONT_OPTIONS = [
  { label: 'Microsoft YaHei', value: 'Microsoft YaHei' },
  { label: 'SimSun (宋体)', value: 'SimSun' },
  { label: 'SimHei (黑体)', value: 'SimHei' },
  { label: 'KaiTi (楷体)', value: 'KaiTi' },
  { label: 'FangSong (仿宋)', value: 'FangSong' },
];

const CARD_TYPE_OPTIONS = [
  '基本牌', '阵营牌', '职业牌', '兵刃', '宝器', '甲胄', '武学', '术法',
];

const QUALITY_LABELS: { key: string; label: string }[] = [
  { key: 'common', label: '普通' },
  { key: 'rare', label: '稀有' },
  { key: 'epic', label: '史诗' },
  { key: 'legendary', label: '传说' },
];

interface SettingsProps {
  onBack: () => void;
}

type OutputPathKey = keyof IAppSettings['outputPaths'];
type CardVisualKey = keyof IAppSettings['cardVisuals'];
type GameConstKey = keyof IAppSettings['gameConstants'];
type EditorPrefKey = keyof IAppSettings['editorPreferences'];

export default function Settings({ onBack }: SettingsProps) {
  const [settings, setSettings] = useState<IAppSettings>(() => configManager.getAll());
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------- 路径浏览 ---------- */

  const browseDirectory = useCallback(async (pathKey: OutputPathKey) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showDirectoryPicker?.();
      if (handle) {
        setSettings((prev) => ({
          ...prev,
          outputPaths: { ...prev.outputPaths, [pathKey]: handle.name },
        }));
      }
    } catch {
      // 用户取消或 API 不可用
    }
  }, []);

  /* ---------- 路径重置 ---------- */

  const resetPath = useCallback((pathKey: OutputPathKey) => {
    setSettings((prev) => ({
      ...prev,
      outputPaths: { ...prev.outputPaths, [pathKey]: DEFAULT_APP_SETTINGS.outputPaths[pathKey] },
    }));
  }, []);

  /* ---------- 分区 B 更新 ---------- */

  const updateVisual = useCallback(
    <K extends CardVisualKey>(key: K, value: IAppSettings['cardVisuals'][K]) => {
      setSettings((prev) => ({
        ...prev,
        cardVisuals: { ...prev.cardVisuals, [key]: value },
      }));
    },
    [],
  );

  const updateQualityScheme = useCallback(
    (quality: string, field: "bgColor" | "textColor" | "borderColor", hex: string) => {
      setSettings((prev) => {
        const schemes = { ...prev.cardVisuals.qualityColorSchemes };
        schemes[quality] = { ...schemes[quality], [field]: hex };
        return {
          ...prev,
          cardVisuals: { ...prev.cardVisuals, qualityColorSchemes: schemes },
        };
      });
    },
    [],
  );

  /* ---------- 分区 C 更新 ---------- */

  const updateGameConst = useCallback(
    <K extends GameConstKey>(key: K, value: IAppSettings['gameConstants'][K]) => {
      setSettings((prev) => ({
        ...prev,
        gameConstants: { ...prev.gameConstants, [key]: value },
      }));
    },
    [],
  );

  /* ---------- 分区 D 更新 ---------- */

  const updateEditor = useCallback(
    <K extends EditorPrefKey>(key: K, value: IAppSettings['editorPreferences'][K]) => {
      setSettings((prev) => ({
        ...prev,
        editorPreferences: { ...prev.editorPreferences, [key]: value },
      }));
    },
    [],
  );

  /* ---------- 保存 ---------- */

  const handleSave = useCallback(() => {
    const sections = Object.keys(settings) as (keyof IAppSettings)[];
    for (const section of sections) {
      if (section === 'version' || section === 'lastModified') continue;
      const sectionData = settings[section] as unknown as Record<string, unknown>;
      for (const key of Object.keys(sectionData)) {
        configManager.set(section, key, sectionData[key]);
      }
    }
    configManager.save();
    message.success('设置已保存');
  }, [settings]);

  /* ---------- 导出 ---------- */

  const handleExport = useCallback(() => {
    const json = configManager.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardmaker_settings_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('设置已导出');
  }, []);

  /* ---------- 导入 ---------- */

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = configManager.importFromJSON(reader.result as string);
      if (result.success) {
        setSettings(configManager.getAll());
        message.success('设置已导入并合并');
      } else {
        message.error(`导入失败: ${result.error}`);
      }
    };
    reader.onerror = () => message.error('文件读取失败');
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  /* ---------- 恢复出厂 ---------- */

  const handleReset = useCallback(() => {
    configManager.reset();
    setSettings(configManager.getAll());
    message.success('已恢复出厂默认设置');
  }, []);

  /* ---------- 渲染路径行 ---------- */

  const renderPathRow = (label: string, pathKey: OutputPathKey, pathValue: string) => (
    <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 12 }}>
      <Col span={4}>
        <Text>{label}</Text>
      </Col>
      <Col span={14}>
        <Input
          value={pathValue}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              outputPaths: { ...prev.outputPaths, [pathKey]: e.target.value },
            }))
          }
          placeholder="输入路径或点击浏览..."
        />
      </Col>
      <Col span={6}>
        <Space.Compact>
          <Button icon={<FolderOpenOutlined />} onClick={() => browseDirectory(pathKey)}>
            浏览
          </Button>
          <Button icon={<UndoOutlined />} onClick={() => resetPath(pathKey)}>
            重置
          </Button>
        </Space.Compact>
      </Col>
    </Row>
  );

  /* ---------- 渲染品质配色行 ---------- */

  const renderQualityRow = (quality: (typeof QUALITY_LABELS)[number]) => {
    const schemes = settings.cardVisuals.qualityColorSchemes;
    const scheme = schemes[quality.key] || { bgColor: '#FFFFFF', textColor: '#000000', borderColor: '#CCCCCC' };
    const qKey = quality.key;
    return (
      <Row key={quality.key} gutter={[12, 8]} align="middle" style={{ marginBottom: 8 }}>
        <Col span={4}>
          <Text strong>{quality.label}</Text>
        </Col>
        <Col span={5}>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>背景</Text>
            <ColorPicker
              value={scheme.bgColor}
              onChange={(_color: Color, hex: string) => updateQualityScheme(qKey, 'bgColor', hex)}
            />
          </Space>
        </Col>
        <Col span={5}>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>文字</Text>
            <ColorPicker
              value={scheme.textColor}
              onChange={(_color: Color, hex: string) => updateQualityScheme(qKey, 'textColor', hex)}
            />
          </Space>
        </Col>
        <Col span={5}>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>边框</Text>
            <ColorPicker
              value={scheme.borderColor}
              onChange={(_color: Color, hex: string) => updateQualityScheme(qKey, 'borderColor', hex)}
            />
          </Space>
        </Col>
      </Row>
    );
  };

  type CardVisualNumKey = Exclude<CardVisualKey, 'qualityColorSchemes'>;

  /* ---------- 卡牌尺寸项 ---------- */

  const cardDimItems: [string, CardVisualNumKey, number, number, string][] = [
    ['宽度', 'cardWidth', 100, 2000, 'px'],
    ['高度', 'cardHeight', 100, 2000, 'px'],
    ['圆角', 'cardBorderRadius', 0, 100, 'px'],
    ['导出倍率', 'exportScale', 1, 8, 'x'],
  ];

  /* ---------- 游戏常量项 ---------- */

  const gameConstItems: [string, GameConstKey, number, number][] = [
    ['生命上限', 'maxHP', 1, 999],
    ['护甲上限', 'maxArmor', 1, 999],
    ['技力上限', 'maxEnergy', 1, 999],
    ['手牌上限', 'maxHandCards', 1, 20],
    ['卡组上限', 'maxDeckSize', 1, 100],
    ['单卡数量上限', 'maxSingleCardCount', 1, 10],
    ['每回合攻击次数', 'attacksPerTurn', 1, 5],
  ];

  /* ---------- 底部操作栏 ---------- */

  const bottomBar = (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: '#fff',
        borderTop: '1px solid #f0f0f0',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
        返回编辑器
      </Button>
      <Button type="primary" size="large" onClick={handleSave}>
        保存设置
      </Button>
    </div>
  );

  /* ---------- 主渲染 ---------- */

  return (
    <div style={{ padding: '24px 24px 80px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <SettingOutlined style={{ fontSize: 20 }} />
          <Text strong style={{ fontSize: 18 }}>应用设置</Text>
        </Space>
      </div>

      <Collapse
        defaultActiveKey={['output', 'visual', 'game', 'editor', 'version']}
        style={{ background: '#fff' }}
        items={[
          /* ---- 分区 A：产出路径 ---- */
          {
            key: 'output',
            label: '产出路径设置',
            children: (
              <Card size="small">
                {renderPathRow('卡牌图片输出目录', 'cardImageOutputDir', settings.outputPaths.cardImageOutputDir)}
                {renderPathRow('数据导出目录', 'dataExportDir', settings.outputPaths.dataExportDir)}
                {renderPathRow('临时文件目录', 'tempFileDir', settings.outputPaths.tempFileDir)}
              </Card>
            ),
          },

          /* ---- 分区 B：卡面视觉 ---- */
          {
            key: 'visual',
            label: '卡面视觉设置',
            children: (
              <Card size="small">
                <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 12 }}>
                  <Col span={4}><Text>默认字体</Text></Col>
                  <Col span={12}>
                    <Select
                      style={{ width: '100%' }}
                      value={settings.cardVisuals.defaultFont}
                      onChange={(v) => updateVisual('defaultFont', v)}
                      options={FONT_OPTIONS}
                    />
                  </Col>
                </Row>

                <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 12 }}>
                  <Col span={4}><Text>默认字号</Text></Col>
                  <Col span={8}>
                    <InputNumber
                      min={12}
                      max={48}
                      value={settings.cardVisuals.defaultFontSize}
                      onChange={(v) => updateVisual('defaultFontSize', v ?? 16)}
                      addonAfter="px"
                    />
                  </Col>
                </Row>

                <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 12 }}>
                  <Col span={4}><Text>默认文字颜色</Text></Col>
                  <Col span={8}>
                    <ColorPicker
                      value={settings.cardVisuals.defaultTextColor}
                      onChange={(_color: Color, hex: string) => updateVisual('defaultTextColor', hex)}
                    />
                  </Col>
                </Row>

                <Divider plain style={{ fontSize: 13 }}>品质配色方案</Divider>
                {QUALITY_LABELS.map(renderQualityRow)}

                <Divider plain style={{ fontSize: 13 }}>卡牌尺寸</Divider>
                <Row gutter={[16, 12]}>
                  {cardDimItems.map(([label, key, min, max, unit]) => (
                    <Col span={6} key={key}>
                      <Space direction="vertical" size={4}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
                        <InputNumber
                          min={min}
                          max={max}
                          value={settings.cardVisuals[key]}
                          onChange={(v) => updateVisual(key, v ?? DEFAULT_APP_SETTINGS.cardVisuals[key])}
                          addonAfter={unit}
                        />
                      </Space>
                    </Col>
                  ))}
                </Row>
              </Card>
            ),
          },

          /* ---- 分区 C：游戏常量 ---- */
          {
            key: 'game',
            label: '游戏常量设置',
            children: (
              <Card size="small">
                <Row gutter={[16, 16]}>
                  {gameConstItems.map(([label, key, min, max]) => (
                    <Col span={6} key={key}>
                      <Space direction="vertical" size={4}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
                        <InputNumber
                          min={min}
                          max={max}
                          value={settings.gameConstants[key]}
                          onChange={(v) =>
                            updateGameConst(key, (v ?? DEFAULT_APP_SETTINGS.gameConstants[key]) as never)
                          }
                        />
                      </Space>
                    </Col>
                  ))}
                  <Col span={12}>
                    <Space direction="vertical" size={4}>
                      <Text type="secondary" style={{ fontSize: 12 }}>冷却时间范围</Text>
                      <Space>
                        <InputNumber
                          min={0}
                          max={999}
                          value={settings.gameConstants.cooldownMin}
                          onChange={(v) => updateGameConst('cooldownMin', v ?? 0)}
                          placeholder="最小"
                        />
                        <Text type="secondary">—</Text>
                        <InputNumber
                          min={0}
                          max={999}
                          value={settings.gameConstants.cooldownMax}
                          onChange={(v) => updateGameConst('cooldownMax', v ?? 10)}
                          placeholder="最大"
                        />
                      </Space>
                    </Space>
                  </Col>
                </Row>
              </Card>
            ),
          },

          /* ---- 分区 D：编辑器偏好 ---- */
          {
            key: 'editor',
            label: '编辑器偏好',
            children: (
              <Card size="small">
                <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 16 }}>
                  <Col span={6}><Text>默认卡牌类型</Text></Col>
                  <Col span={12}>
                    <Select
                      style={{ width: '100%' }}
                      value={settings.editorPreferences.defaultCardType}
                      onChange={(v) => updateEditor('defaultCardType', v)}
                      options={CARD_TYPE_OPTIONS.map((t) => ({ label: t, value: t }))}
                    />
                  </Col>
                </Row>

                <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 16 }}>
                  <Col span={6}><Text>自动拆条</Text></Col>
                  <Col span={12}>
                    <Switch
                      checked={settings.editorPreferences.autoSplit}
                      onChange={(v) => updateEditor('autoSplit', v)}
                    />
                  </Col>
                </Row>

                <Row gutter={[8, 8]} align="middle">
                  <Col span={6}><Text>语法校验严格度</Text></Col>
                  <Col span={18}>
                    <Radio.Group
                      value={settings.editorPreferences.syntaxCheckLevel}
                      onChange={(e) => updateEditor('syntaxCheckLevel', e.target.value)}
                    >
                      <Radio.Button value="error-only">仅错误</Radio.Button>
                      <Radio.Button value="error-warning">错误 + 警告</Radio.Button>
                      <Radio.Button value="all">全部</Radio.Button>
                    </Radio.Group>
                  </Col>
                </Row>
              </Card>
            ),
          },

          /* ---- 分区 E：版本管理 ---- */
          {
            key: 'version',
            label: '版本管理',
            children: (
              <Card size="small">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Space wrap>
                    <Button icon={<ExportOutlined />} onClick={handleExport}>
                      导出全部设置为 JSON
                    </Button>
                    <Button icon={<ImportOutlined />} onClick={handleImportClick}>
                      导入设置
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={handleImportFile}
                    />
                    <Popconfirm
                      title="确定恢复出厂默认设置？"
                      description="所有自定义设置将被覆盖。"
                      onConfirm={handleReset}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button danger>恢复出厂默认设置</Button>
                    </Popconfirm>
                  </Space>

                  <Divider />

                  <Space direction="vertical" size={4}>
                    <Text type="secondary">
                      设置版本：{settings.version}
                    </Text>
                    <Text type="secondary">
                      上次修改：
                      {settings.lastModified
                        ? new Date(settings.lastModified).toLocaleString()
                        : '尚未保存'}
                    </Text>
                  </Space>
                </Space>
              </Card>
            ),
          },
        ]}
      />

      {bottomBar}
    </div>
  );
}
