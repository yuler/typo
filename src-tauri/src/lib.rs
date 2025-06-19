use enigo::Keyboard;
use tauri_plugin_clipboard_manager::ClipboardExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn get_selected_text() -> Result<String, String> {
    let text = get_selected_text::get_selected_text().map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
async fn type_text(text: String, window: tauri::Window) -> Result<(), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).unwrap();

    // Through clipboard copy/paste text content avoid no-english input method
    println!("text: {}", text);
    
    // Use the window's clipboard instead of creating a new app
    window.clipboard().write_text(text.clone()).map_err(|e| e.to_string())?;

    // Small delay to ensure clipboard is updated
    std::thread::sleep(std::time::Duration::from_millis(200));

    // Ctrl + V to paste text
    let control_or_command = if cfg!(target_os = "macos") {
        enigo::Key::Meta
    } else {
        enigo::Key::Control
    };
    
    enigo.key(control_or_command, enigo::Direction::Press).map_err(|e| e.to_string())?;
    enigo.key(enigo::Key::Unicode('v'), enigo::Direction::Click).map_err(|e| e.to_string())?;
    enigo.key(control_or_command, enigo::Direction::Release).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_selected_text, type_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
