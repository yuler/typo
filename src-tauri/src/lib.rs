use enigo::Keyboard;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn get_selected_text() -> Result<String, String> {
    let text = get_selected_text::get_selected_text().map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
async fn type_text(text: String) -> Result<(), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).unwrap();

    enigo.text(&text).unwrap();

    // First press Escape to clear any existing IME state
    // enigo
    //     .key(enigo::Key::Escape, enigo::Direction::Press)
    //     .unwrap();
    // enigo
    //     .key(enigo::Key::Escape, enigo::Direction::Release)
    //     .unwrap();

    // // Type each character individually to avoid IME
    // for c in text.chars() {
    //     if c.is_ascii() {
    //         enigo
    //             .key(enigo::Key::Unicode(c), enigo::Direction::Press)
    //             .unwrap();
    //         enigo
    //             .key(enigo::Key::Unicode(c), enigo::Direction::Release)
    //             .unwrap();
    //     }
    // }

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
