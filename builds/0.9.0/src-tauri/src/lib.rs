use tauri::Manager;
use base64::Engine;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("你好, {}! 欢迎使用 CardMaker。", name)
}

#[tauri::command]
fn save_card_data(path: String, content: String) -> Result<String, String> {
    std::fs::write(&path, &content).map_err(|e| e.to_string())?;
    Ok(format!("卡牌数据已保存到: {}", path))
}

#[tauri::command]
fn save_card_image(path: String, data_base64: String) -> Result<String, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&data_base64)
        .map_err(|e| e.to_string())?;
    std::fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    Ok(format!("卡牌图片已保存到: {}", path))
}

#[tauri::command]
fn load_card_data(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, save_card_data, save_card_image, load_card_data])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动 CardMaker 失败");
}
