use devtools::full_report;
use std::fs;

fn main() {
    let report = full_report();
    
    let mut output = String::new();
    output.push_str("=== ObwilerCardMaker DevTools Self Check Report ===\n");
    output.push_str(&format!("Total: {} | Passed: {} | Failed: {}\n", report.total, report.passed, report.failed));
    output.push_str(&format!("Summary: {}\n\n", report.summary));
    
    for check in &report.checks {
        let status = if check.passed { "PASS" } else { "FAIL" };
        output.push_str(&format!("[{}] {} ({}ms)\n", status, check.name, check.duration_ms));
        if !check.passed {
            let preview: String = check.stderr.chars().take(300).collect();
            if !preview.is_empty() {
                output.push_str(&format!("  stderr: {}\n", preview));
            }
        }
    }
    
    let out_path = "F:/TOOLS/ObwilerCardMaker/builds/1.0.0/self_check_report.txt";
    fs::write(out_path, &output).unwrap_or_else(|e| eprintln!("Write failed: {}", e));
    println!("{}", output);
    println!("Report saved to builds/1.0.0/self_check_report.txt");
}
