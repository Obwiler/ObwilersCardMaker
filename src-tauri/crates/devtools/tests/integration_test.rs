//! devtools crate 集成测试：8 项健康检查、错题集 CRUD、ErrorEntry

use devtools::{
    CheckResult, HealthReport, ErrorEntry,
    error_log_path, read_error_log, append_error_entry,
    clear_error_log, error_summary, record_errors_from_report,
    check_cargo, check_tsc, test_crate, build_frontend,
    check_fmt, check_clippy, full_report,
};

// ============ 8 项健康检查正常场景 ============

#[test]
fn test_check_result_creation() {
    let cr = CheckResult {
        name: "test check".into(),
        passed: true,
        duration_ms: 1500,
        stdout: "all good".into(),
        stderr: "".into(),
        exit_code: Some(0),
    };
    assert!(cr.passed);
    assert_eq!(cr.name, "test check");
    assert_eq!(cr.duration_ms, 1500);
    assert_eq!(cr.exit_code, Some(0));
}

#[test]
fn test_health_report_all_passed() {
    let checks = vec![
        CheckResult { name: "cargo check".into(), passed: true, duration_ms: 100, stdout: "".into(), stderr: "".into(), exit_code: Some(0) },
        CheckResult { name: "tsc --noEmit".into(), passed: true, duration_ms: 50, stdout: "".into(), stderr: "".into(), exit_code: Some(0) },
    ];
    let report = HealthReport {
        total: 2,
        passed: 2,
        failed: 0,
        checks: checks.clone(),
        summary: "ALL CHECKS PASSED".into(),
    };
    assert_eq!(report.total, 2);
    assert_eq!(report.passed, 2);
    assert_eq!(report.failed, 0);
}

#[test]
fn test_health_report_partial_failure() {
    let checks = vec![
        CheckResult { name: "check 1".into(), passed: true, duration_ms: 100, stdout: "".into(), stderr: "".into(), exit_code: Some(0) },
        CheckResult { name: "check 2".into(), passed: false, duration_ms: 200, stdout: "".into(), stderr: "error!".into(), exit_code: Some(1) },
        CheckResult { name: "check 3".into(), passed: false, duration_ms: 50, stdout: "".into(), stderr: "fail".into(), exit_code: Some(2) },
    ];
    let report = HealthReport {
        total: 3,
        passed: 1,
        failed: 2,
        checks: checks.clone(),
        summary: "2/3 FAILED".into(),
    };
    assert_eq!(report.passed, 1);
    assert_eq!(report.failed, 2);
    assert!(report.summary.contains("FAILED"));
}

#[test]
fn test_check_result_failed_with_stderr() {
    let cr = CheckResult {
        name: "failed check".into(),
        passed: false,
        duration_ms: 300,
        stdout: "".into(),
        stderr: "compilation error at line 42".into(),
        exit_code: Some(1),
    };
    assert!(!cr.passed);
    assert!(cr.stderr.contains("compilation error"));
    assert_eq!(cr.exit_code, Some(1));
}

#[test]
fn test_check_result_failed_spawn_error() {
    let cr = CheckResult {
        name: "missing tool".into(),
        passed: false,
        duration_ms: 0,
        stdout: "".into(),
        stderr: "failed: program not found".into(),
        exit_code: None,
    };
    assert!(!cr.passed);
    assert!(cr.stderr.contains("failed:"));
    assert_eq!(cr.exit_code, None);
}

// ============ 预期失败检查项 ============

#[test]
fn test_check_cargo_may_fail() {
    // cargo check 可能因环境未配置而失败，但不 panic
    let result = std::panic::catch_unwind(|| check_cargo());
    // 即使环境不可用，函数本身不应 panic
    assert!(result.is_ok());
}

#[test]
fn test_check_tsc_may_fail() {
    let result = std::panic::catch_unwind(|| check_tsc());
    assert!(result.is_ok());
}

#[test]
fn test_build_frontend_may_fail() {
    let result = std::panic::catch_unwind(|| build_frontend());
    assert!(result.is_ok());
}

// ============ 错题集 CRUD ============

#[test]
fn test_error_entry_serde() {
    let entry = ErrorEntry {
        check: "cargo test -p parser".to_string(),
        unix_secs: 1717286400,
        stderr_snippet: "assertion failed: left == right".to_string(),
        exit_code: Some(101),
    };
    let json = serde_json::to_string(&entry).unwrap();
    let restored: ErrorEntry = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.check, entry.check);
    assert_eq!(restored.unix_secs, 1717286400);
    assert_eq!(restored.exit_code, Some(101));
}

#[test]
fn test_clear_error_log() {
    clear_error_log();
    assert!(!error_log_path().exists() || read_error_log().is_empty());
}

#[test]
fn test_append_and_read_error_log() {
    clear_error_log();

    let entry = ErrorEntry {
        check: "test_check_1".into(),
        unix_secs: 1000,
        stderr_snippet: "error 1".into(),
        exit_code: Some(1),
    };
    append_error_entry(&entry);
    let log = read_error_log();
    assert_eq!(log.len(), 1);
    assert_eq!(log[0].check, "test_check_1");

    let entry2 = ErrorEntry {
        check: "test_check_2".into(),
        unix_secs: 2000,
        stderr_snippet: "error 2".into(),
        exit_code: Some(2),
    };
    append_error_entry(&entry2);
    let log = read_error_log();
    assert_eq!(log.len(), 2);
}

#[test]
fn test_error_summary_empty() {
    clear_error_log();
    let summary = error_summary();
    assert!(summary.is_empty());
}

#[test]
fn test_error_summary_grouped() {
    clear_error_log();

    for _ in 0..3 {
        append_error_entry(&ErrorEntry {
            check: "cargo clippy".into(),
            unix_secs: 1000,
            stderr_snippet: "warning".into(),
            exit_code: Some(1),
        });
    }
    for _ in 0..2 {
        append_error_entry(&ErrorEntry {
            check: "cargo test -p duel".into(),
            unix_secs: 2000,
            stderr_snippet: "panic".into(),
            exit_code: Some(101),
        });
    }

    let summary = error_summary();
    assert_eq!(summary.len(), 2);
    // 按次数降序排列
    assert_eq!(summary[0].0, "cargo clippy");
    assert_eq!(summary[0].1, 3);
    assert_eq!(summary[1].0, "cargo test -p duel");
    assert_eq!(summary[1].1, 2);
}

#[test]
fn test_record_errors_from_report() {
    clear_error_log();

    let checks = vec![
        CheckResult { name: "pass".into(), passed: true, duration_ms: 1, stdout: "".into(), stderr: "".into(), exit_code: Some(0) },
        CheckResult { name: "fail1".into(), passed: false, duration_ms: 2, stdout: "".into(), stderr: "bad thing".into(), exit_code: Some(1) },
        CheckResult { name: "fail2".into(), passed: false, duration_ms: 3, stdout: "".into(), stderr: "other bad".into(), exit_code: Some(2) },
    ];
    let report = HealthReport {
        total: 3,
        passed: 1,
        failed: 2,
        checks,
        summary: "2/3 FAILED".into(),
    };

    let entries = record_errors_from_report(&report);
    assert_eq!(entries.len(), 2);
    assert_eq!(entries[0].check, "fail1");
    assert_eq!(entries[1].check, "fail2");

    let log = read_error_log();
    assert_eq!(log.len(), 2);
}

// ============ full_report 不 panic ============

#[test]
fn test_full_report_does_not_panic() {
    let result = std::panic::catch_unwind(|| full_report());
    assert!(result.is_ok());
}

// ============ CheckResult edge cases ============

#[test]
fn test_check_result_zero_duration() {
    let cr = CheckResult {
        name: "instant".into(),
        passed: true,
        duration_ms: 0,
        stdout: "".into(),
        stderr: "".into(),
        exit_code: Some(0),
    };
    assert_eq!(cr.duration_ms, 0);
}

#[test]
fn test_health_report_all_failed() {
    let checks: Vec<CheckResult> = (0..8).map(|i| CheckResult {
        name: format!("check_{}", i),
        passed: false,
        duration_ms: 10,
        stdout: "".into(),
        stderr: "all broken".into(),
        exit_code: Some(1),
    }).collect();
    let report = HealthReport {
        total: 8,
        passed: 0,
        failed: 8,
        checks,
        summary: "8/8 FAILED".into(),
    };
    assert_eq!(report.passed, 0);
    assert_eq!(report.failed, 8);
}
