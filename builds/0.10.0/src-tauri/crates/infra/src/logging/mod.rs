use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use chrono::Local;
use dz_cardmaker_ports::{LogPort, ParseError, StaticCardId};

pub struct DevToolsLogger {
    log_file: PathBuf,
    error_log: PathBuf,
    log_handle: Mutex<fs::File>,
    error_handle: Mutex<fs::File>,
}

impl DevToolsLogger {
    pub fn new(log_dir: &Path) -> Self {
        fs::create_dir_all(log_dir).expect("无法创建日志目录");

        let log_file = log_dir.join("devtools.log");
        let error_log = log_dir.join("error_log.json");

        let log_handle = Mutex::new(
            OpenOptions::new()
                .create(true)
                .append(true)
                .open(&log_file)
                .expect("无法打开日志文件"),
        );

        let error_handle = Mutex::new(
            OpenOptions::new()
                .create(true)
                .append(true)
                .open(&error_log)
                .expect("无法打开错误日志文件"),
        );

        Self {
            log_file,
            error_log,
            log_handle,
            error_handle,
        }
    }

    fn timestamp() -> String {
        Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string()
    }

    fn write_log(&self, level: &str, msg: &str) {
        let line = format!("[{}] [{}] {}\n", Self::timestamp(), level, msg);

        print!("{}", line);
        let _ = std::io::stdout().flush();

        if let Ok(mut handle) = self.log_handle.lock() {
            let _ = handle.write_all(line.as_bytes());
            let _ = handle.flush();
        }
    }

    pub fn log_path(&self) -> &Path {
        &self.log_file
    }

    pub fn error_log_path(&self) -> &Path {
        &self.error_log
    }
}

impl Default for DevToolsLogger {
    fn default() -> Self {
        Self::new(&PathBuf::from("logs"))
    }
}

impl LogPort for DevToolsLogger {
    fn info(&self, msg: &str) {
        self.write_log("INFO", msg);
    }

    fn warn(&self, msg: &str) {
        self.write_log("WARN", msg);
    }

    fn error(&self, msg: &str) {
        self.write_log("ERROR", msg);
    }

    fn record_parse_error(&self, card_id: &StaticCardId, errors: &[ParseError]) {
        let entry = serde_json::json!({
            "timestamp": Self::timestamp(),
            "card_id": card_id.0,
            "errors": errors.iter().map(|e| {
                serde_json::json!({
                    "line": e.line,
                    "col": e.col,
                    "message": e.message,
                    "severity": format!("{:?}", e.severity),
                })
            }).collect::<Vec<_>>(),
        });

        let line = serde_json::to_string(&entry).unwrap_or_default();

        if let Ok(mut handle) = self.error_handle.lock() {
            let _ = writeln!(handle, "{}", line);
            let _ = handle.flush();
        }

        for err in errors {
            self.write_log(
                "ERROR",
                &format!("解析错误 [{}] 第{}行第{}列: {}", card_id.0, err.line, err.col, err.message),
            );
        }
    }

    fn get_recent_errors(&self, limit: usize) -> Vec<String> {
        let file = match fs::File::open(&self.error_log) {
            Ok(f) => f,
            Err(_) => return Vec::new(),
        };

        let reader = BufReader::new(file);
        let lines: Vec<String> = reader.lines().filter_map(|l| l.ok()).collect();

        lines.into_iter().rev().take(limit).rev().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_info_warn_error() {
        let dir = tempfile::tempdir().unwrap();
        let logger = DevToolsLogger::new(dir.path());

        logger.info("info message");
        logger.warn("warn message");
        logger.error("error message");

        let content = fs::read_to_string(logger.log_path()).unwrap();
        assert!(content.contains("[INFO]"));
        assert!(content.contains("[WARN]"));
        assert!(content.contains("[ERROR]"));
        assert!(content.contains("info message"));
        assert!(content.contains("warn message"));
        assert!(content.contains("error message"));
    }

    #[test]
    fn test_record_parse_error() {
        let dir = tempfile::tempdir().unwrap();
        let logger = DevToolsLogger::new(dir.path());

        let card_id = StaticCardId("card-001".to_string());
        let errors = vec![
            ParseError {
                line: 1,
                col: 5,
                message: "语法错误".to_string(),
                severity: dz_cardmaker_ports::IssueSeverity::Error,
            },
        ];

        logger.record_parse_error(&card_id, &errors);

        let content = fs::read_to_string(logger.error_log_path()).unwrap();
        assert!(content.contains("card-001"));
        assert!(content.contains("语法错误"));
        assert!(content.contains(r#""line":1"#));
    }

    #[test]
    fn test_get_recent_errors() {
        let dir = tempfile::tempdir().unwrap();
        let logger = DevToolsLogger::new(dir.path());
        let card_id = StaticCardId("card-001".to_string());
        let errors = vec![
            ParseError {
                line: 1,
                col: 1,
                message: "err1".to_string(),
                severity: dz_cardmaker_ports::IssueSeverity::Error,
            },
        ];

        logger.record_parse_error(&card_id, &errors);

        let card_id2 = StaticCardId("card-002".to_string());
        logger.record_parse_error(&card_id2, &errors);

        let recent = logger.get_recent_errors(1);
        assert_eq!(recent.len(), 1);
        assert!(recent[0].contains("card-002"));
    }

    #[test]
    fn test_get_recent_errors_empty() {
        let dir = tempfile::tempdir().unwrap();
        let logger = DevToolsLogger::new(dir.path());

        let recent = logger.get_recent_errors(10);
        assert!(recent.is_empty());
    }

    #[test]
    fn test_log_file_created() {
        let dir = tempfile::tempdir().unwrap();
        let logger = DevToolsLogger::new(dir.path());

        assert!(logger.log_path().exists());
        assert!(logger.error_log_path().exists());
    }
}
