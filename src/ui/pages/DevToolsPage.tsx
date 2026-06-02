/**
 * DevToolsPage — AI辅助开发自检面板
 * 一键运行 8 项检查，逐项重跑，结果着色展示
 * 错题集自动写入 F:/TOOLS/ObwilerCardMaker/error_log.json
 */

import React, { useState } from "react";
import { invokeRunFullHealthCheck, invokeRunSingleCheck } from "../../lib/tauri";
import type { HealthReport, CheckResult } from "../../types/devtools";

const ALL_CHECKS = [
  { id: "cargo", label: "cargo check" },
  { id: "tsc", label: "tsc --noEmit" },
  { id: "test:tag", label: "test tag crate" },
  { id: "test:parser", label: "test parser crate" },
  { id: "test:duel", label: "test duel crate" },
  { id: "fmt", label: "cargo fmt --check" },
  { id: "clippy", label: "cargo clippy" },
  { id: "frontend", label: "pnpm build" },
];

export const DevToolsPage: React.FC = () => {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [running, setRunning] = useState(false);
  const [singleResults, setSingleResults] = useState<Map<string, CheckResult>>(new Map());

  const runAll = async () => {
    setRunning(true);
    const res = await invokeRunFullHealthCheck();
    if (res.ok) {
      setReport(res.data);
    }
    setRunning(false);
  };

  const runOne = async (id: string) => {
    const res = await invokeRunSingleCheck(id);
    if (res.ok) {
      setSingleResults((prev) => new Map(prev).set(id, res.data));
    }
  };

  const resultMap = new Map<string, CheckResult>();
  if (report) {
    for (const c of report.checks) {
      resultMap.set(normalizeKey(c.name), c);
    }
  }
  for (const [k, v] of singleResults) {
    resultMap.set(k, v);
  }

  return (
    <div style={{ padding: "24px", overflow: "auto", height: "100%" }}>
      <h2 style={{ margin: "0 0 8px", fontSize: "20px" }}>AI 自检诊断</h2>
      <p style={{ margin: "0 0 20px", color: "#888", fontSize: "13px" }}>
        一键运行 8 项检查。绿色通过，红色失败。点击单项可单独重跑。失败项自动写入错题集。
      </p>

      <button
        onClick={runAll}
        disabled={running}
        style={{
          padding: "8px 24px",
          background: running ? "#555" : "#4f46e5",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: running ? "not-allowed" : "pointer",
          fontWeight: 600,
          marginBottom: "16px",
          marginRight: "8px",
        }}
      >
        {running ? "运行中..." : "一键全检"}
      </button>

      {report && (
        <span style={{ fontWeight: 700, fontSize: "15px", color: report.failed === 0 ? "#22c55e" : "#ef4444" }}>
          {report.summary} ({report.passed}/{report.total} 通过)
        </span>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
        {ALL_CHECKS.map((c) => (
          <button
            key={c.id}
            onClick={() => runOne(c.id)}
            style={{
              padding: "4px 12px",
              fontSize: "12px",
              border: "1px solid #444",
              borderRadius: "4px",
              background: "#1e1e2e",
              color: "#ccc",
              cursor: "pointer",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {report && report.checks.map((c, i) => (
        <div
          key={i}
          style={{
            border: `1px solid ${c.passed ? "#22c55e44" : "#ef444444"}`,
            borderRadius: "6px",
            padding: "10px 14px",
            marginBottom: "8px",
            background: c.passed ? "#22c55e0a" : "#ef44440a",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontWeight: 600, fontSize: "14px", color: c.passed ? "#22c55e" : "#ef4444" }}>
              {c.passed ? "PASS" : "FAIL"} {c.name}
            </span>
            <span style={{ fontSize: "12px", color: "#666" }}>{c.duration_ms}ms</span>
          </div>
          {!c.passed && c.stderr && (
            <pre style={{
              fontSize: "11px",
              color: "#ef4444",
              background: "#1a1115",
              padding: "8px",
              borderRadius: "4px",
              overflow: "auto",
              maxHeight: "160px",
              margin: 0,
              whiteSpace: "pre-wrap",
            }}>
              {c.stderr}
            </pre>
          )}
        </div>
      ))}

      {report && report.checks.filter((c) => !c.passed).length === 0 && (
        <div style={{ color: "#22c55e", fontWeight: 600, fontSize: "16px", marginTop: "16px" }}>
          所有检查通过
        </div>
      )}

      {/* ─── AI 指挥指南 ─────────────────────────────────── */}
      <div style={{
        marginTop: "32px",
        borderTop: "1px solid #333",
        paddingTop: "18px",
      }}>
        <h3 style={{ margin: "0 0 10px", fontSize: "16px", color: "#a78bfa" }}>
          如何指挥 AI 进行自检
        </h3>

        <p style={{ color: "#888", fontSize: "13px", margin: "0 0 12px" }}>
          将以下提示词发给任意 AI 编程助手（Trae / Cursor / Claude 等），
          即可让 AI 自动运行项目配套的 8 项检查。
        </p>

        <div style={{
          background: "#111122",
          border: "1px solid #333355",
          borderRadius: "8px",
          padding: "14px 18px",
          marginBottom: "12px",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}>
            <span style={{ fontSize: "12px", color: "#a78bfa", fontWeight: 600 }}>
              标准自检提示词
            </span>
          </div>
          <pre style={{
            fontSize: "12px",
            color: "#ccc",
            margin: 0,
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
          }}>
{`请运行 cargo check、tsc --noEmit、cargo test -p tag/parser/duel、
cargo fmt --check、cargo clippy、pnpm build 这 8 项检查，
汇总结果，对失败项分析原因并尝试修复。
修复后重新运行失败项直到全部通过。`}
          </pre>
        </div>

        <div style={{
          background: "#111122",
          border: "1px solid #333355",
          borderRadius: "8px",
          padding: "14px 18px",
          marginBottom: "12px",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}>
            <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: 600 }}>
              含错题集经验版（推荐）
            </span>
          </div>
          <pre style={{
            fontSize: "12px",
            color: "#ccc",
            margin: 0,
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
          }}>
{`先读取项目根目录的 error_log.json（错题集），
了解历史高频失败项。然后运行 cargo check、tsc --noEmit、
cargo test -p tag/parser/duel、cargo fmt --check、
cargo clippy、pnpm build，优先处理错题集中
高频出现的检查项。全部修复后运行 8 项全检确认。`}
          </pre>
        </div>

        <div style={{
          background: "#111122",
          border: "1px solid #333355",
          borderRadius: "8px",
          padding: "14px 18px",
        }}>
          <span style={{ fontSize: "12px", color: "#eab308", fontWeight: 600, display: "block", marginBottom: "8px" }}>
            环境上下文（发给 AI 时附带）
          </span>
          <pre style={{
            fontSize: "12px",
            color: "#ccc",
            margin: 0,
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
          }}>
{`项目路径: F:/TOOLS/ObwilerCardMaker
激活脚本: F:/TOOLS/activate.ps1  (设置 Node/Rust/JDK/Android 环境)
错题集:   F:/TOOLS/ObwilerCardMaker/error_log.json`}
          </pre>
        </div>
      </div>
    </div>
  );
};

function normalizeKey(name: string): string {
  if (name.startsWith("cargo check")) return "cargo";
  if (name.startsWith("tsc")) return "tsc";
  if (name.includes("tag")) return "test:tag";
  if (name.includes("parser")) return "test:parser";
  if (name.includes("duel")) return "test:duel";
  if (name.includes("fmt")) return "fmt";
  if (name.includes("clippy")) return "clippy";
  if (name.includes("build")) return "frontend";
  return name;
}
