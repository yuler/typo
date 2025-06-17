mod tray;

use enigo::Keyboard;

#[tauri::command]
async fn process_text(text: String) -> Result<(), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).unwrap();

    // First press Escape to clear any existing IME state
    enigo
        .key(enigo::Key::Escape, enigo::Direction::Press)
        .unwrap();
    enigo
        .key(enigo::Key::Escape, enigo::Direction::Release)
        .unwrap();

    // Type each character individually to avoid IME
    for c in text.chars() {
        if c.is_ascii() {
            enigo
                .key(enigo::Key::Unicode(c), enigo::Direction::Press)
                .unwrap();
            enigo
                .key(enigo::Key::Unicode(c), enigo::Direction::Release)
                .unwrap();
        }
    }

    Ok(())
}

#[tauri::command]
async fn get_selected_text() -> Result<String, String> {
    let text = get_selected_text::get_selected_text().map_err(|e| e.to_string())?;
    Ok(text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("Running");
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![process_text, get_selected_text])
        .setup(|app| {
            let app_handle = app.handle();
            tray::create_tray(&app_handle)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
