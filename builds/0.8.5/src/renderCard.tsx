import { createRoot } from "react-dom/client";
import CardPreview from "@/components/CardPreview";
import type { ICard } from "@/atomic";

// 从 URL 参数 ?data= 中读取 base64 编码的 ICard JSON
const params = new URLSearchParams(window.location.search);
const dataParam = params.get("data");
let card: ICard | null = null;
if (dataParam) {
  try {
    const base64str = decodeURIComponent(dataParam);
    // atob 输出 Latin-1 二进制串，需用 TextDecoder 还原 UTF-8
    const binary = atob(base64str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const jsonStr = new TextDecoder("utf-8").decode(bytes);
    card = JSON.parse(jsonStr) as ICard;
  } catch (e) {
    console.error("Failed to decode card data:", e);
  }
}

// 仅渲染 CardPreview，截图由 Puppeteer 端 deviceScaleFactor 控制
const rootEl = document.getElementById("render-root");
if (rootEl) {
  createRoot(rootEl).render(<CardPreview card={card} />);
}
