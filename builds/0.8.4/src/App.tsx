import { ConfigProvider, Steps } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useCardStore } from "@/store";
import Step1_CardType from "@/pages/Step1_CardType";
import Step2_BasicInfo from "@/pages/Step2_BasicInfo";
import Step3_EffectEdit from "@/pages/Step3_EffectEdit";
import Step4_Export from "@/pages/Step4_Export";
import { ErrorBoundary } from "@/components";

function App() {
  const currentStep = useCardStore((s) => s.currentStep);
  const nextStep = useCardStore((s) => s.nextStep);
  const prevStep = useCardStore((s) => s.prevStep);

  const steps = [
    { title: "选择类型" },
    { title: "基本信息" },
    { title: "配置技能" },
    { title: "预览导出" },
  ];

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: "#1677ff" } }}>
      <ErrorBoundary>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
          <h1 style={{ textAlign: "center", marginBottom: 32 }}>
            CardMaker v0.8.3
          </h1>
          <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />
          <div style={{ minHeight: 500 }}>
            {currentStep === 0 && <Step1_CardType onNext={nextStep} />}
            {currentStep === 1 && <Step2_BasicInfo onNext={nextStep} onPrev={prevStep} />}
            {currentStep === 2 && <Step3_EffectEdit onNext={nextStep} onPrev={prevStep} />}
            {currentStep === 3 && <Step4_Export onPrev={prevStep} />}
          </div>
        </div>
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default App;
