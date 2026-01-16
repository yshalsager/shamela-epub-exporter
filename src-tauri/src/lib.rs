use tauri::Manager;

#[tauri::command]
fn webview_get_url(label: String, app: tauri::AppHandle) -> Result<String, String> {
    let webview = app
        .get_webview_window(&label)
        .ok_or_else(|| format!("Webview window not found: {label}"))?;
    let url = webview.url().map_err(|err| err.to_string())?;
    Ok(url.to_string())
}

#[tauri::command]
fn webview_eval(label: String, script: String, app: tauri::AppHandle) -> Result<(), String> {
    let webview = app
        .get_webview_window(&label)
        .ok_or_else(|| format!("Webview window not found: {label}"))?;
    webview.eval(&script).map_err(|err| err.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![webview_get_url, webview_eval])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
