pub use core;

// devtools — AI辅助开发诊断模块
// 编译检查 / 单元测试 / 构建验证

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckResult {
    pub name: String,
    pub passed: bool,
    pub duration_ms: u64,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthReport {
    pub total: usize,
    pub passed: usize,
    pub failed: usize,
    pub checks: Vec<CheckResult>,
    pub summary: String,
}

const PROJECT_ROOT: &str = "F:/TOOLS/ObwilerCardMaker";
const SRC_TAURI: &str = "F:/TOOLS/ObwilerCardMaker/src-tauri";

fn run(name: &str, program: &str, args: &[&str], dir: &str) -> CheckResult {
    let t0 = Instant::now();
    let out = Command::new(program)
        .args(args)
        .current_dir(dir)
        .env("RUSTUP_HOME", "F:/TOOLS/rust")
        .env("CARGO_HOME", "F:/TOOLS/rust")
        .env("JAVA_HOME", "F:/TOOLS/jdk")
        .output();
    let ms = t0.elapsed().as_millis() as u64;
    match out {
        Ok(o) => {
            let ok = o.status.success();
            CheckResult {
                name: name.into(),
                passed: ok,
                duration_ms: ms,
                stdout: clip(&String::from_utf8_lossy(&o.stdout), 4000),
                stderr: clip(&String::from_utf8_lossy(&o.stderr), 4000),
                exit_code: o.status.code(),
            }
        }
        Err(e) => CheckResult {
            name: name.into(),
            passed: false,
            duration_ms: ms,
            stdout: String::new(),
            stderr: format!("failed: {}", e),
            exit_code: None,
        },
    }
}

fn clip(s: &str, max: usize) -> String {
    if s.len() <= max { s.into() }
    else { format!("{}...\n[truncated {} chars]", &s[..max], s.len()-max) }
}

// ---- single checks ----

pub fn check_cargo() -> CheckResult {
    run("cargo check", "cargo", &["check"], SRC_TAURI)
}

pub fn check_tsc() -> CheckResult {
    run("tsc --noEmit", "npx", &["tsc", "--noEmit"], PROJECT_ROOT)
}

pub fn test_crate(c: &str) -> CheckResult {
    run(&format!("cargo test -p {}", c), "cargo", &["test", "-p", c], SRC_TAURI)
}

pub fn build_frontend() -> CheckResult {
    run("pnpm build", "pnpm", &["build"], PROJECT_ROOT)
}

pub fn check_fmt() -> CheckResult {
    run("cargo fmt --check", "cargo", &["fmt", "--check"], SRC_TAURI)
}

pub fn check_clippy() -> CheckResult {
    run("cargo clippy", "cargo", &["clippy", "--", "-D", "warnings"], SRC_TAURI)
}

// ---- full report ----

pub fn full_report() -> HealthReport {
    let checks = vec![
        check_cargo(),
        check_tsc(),
        test_crate("tag"),
        test_crate("parser"),
        test_crate("duel"),
        check_fmt(),
        check_clippy(),
        build_frontend(),
    ];
    let passed = checks.iter().filter(|c| c.passed).count();
    let failed = checks.len() - passed;
    let summary = if failed == 0 {
        "ALL CHECKS PASSED".into()
    } else {
        format!("{}/{} FAILED", failed, checks.len())
    };
    let report = HealthReport { total: checks.len(), passed, failed, checks, summary };
    record_errors_from_report(&report);
    report
}

// ─── 错题集 ───────────────────────────────────────────────────

/// 一条错误记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorEntry {
    pub check: String,
    /// Unix 时间戳（秒）
    pub unix_secs: u64,
    pub stderr_snippet: String,
    pub exit_code: Option<i32>,
}

/// 错题集路径: 项目根 / error_log.json
pub fn error_log_path() -> PathBuf {
    PathBuf::from(PROJECT_ROOT).join("error_log.json")
}

/// 读取全部错题记录
pub fn read_error_log() -> Vec<ErrorEntry> {
    let path = error_log_path();
    if !path.exists() {
        return vec![];
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// 追加一条错误记录
pub fn append_error_entry(entry: &ErrorEntry) {
    let mut log = read_error_log();
    log.push(entry.clone());
    let path = error_log_path();
    if let Ok(json) = serde_json::to_string_pretty(&log) {
        let _ = std::fs::write(&path, json);
    }
}

/// 从 HealthReport 提取失败项写入错题集
pub fn record_errors_from_report(report: &HealthReport) -> Vec<ErrorEntry> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let mut entries = vec![];
    for check in &report.checks {
        if !check.passed {
            let entry = ErrorEntry {
                check: check.name.clone(),
                unix_secs: now,
                stderr_snippet: check.stderr.chars().take(500).collect(),
                exit_code: check.exit_code,
            };
            append_error_entry(&entry);
            entries.push(entry);
        }
    }
    entries
}

/// 清除错题集
pub fn clear_error_log() {
    let _ = std::fs::remove_file(error_log_path());
}

/// 错题摘要：按检查项分组统计失败次数
pub fn error_summary() -> Vec<(String, usize)> {
    let log = read_error_log();
    let mut counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for entry in &log {
        *counts.entry(entry.check.clone()).or_insert(0) += 1;
    }
    let mut v: Vec<_> = counts.into_iter().collect();
    v.sort_by(|a, b| b.1.cmp(&a.1));
    v
}
