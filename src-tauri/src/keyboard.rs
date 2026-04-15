use enigo::Keyboard;
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::wl_clipboard;

/// Sends `Ctrl + c` (Linux/Windows) to copy the current selection into the clipboard.
pub(crate) fn send_copy_shortcut_sync() -> Result<(), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).map_err(|e| e.to_string())?;

    let control_or_command = if cfg!(target_os = "macos") {
        enigo::Key::Meta
    } else {
        enigo::Key::Control
    };

    // Release all modifiers
    let _ = enigo.key(enigo::Key::Control, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Alt, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Shift, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Space, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Tab, enigo::Direction::Release);

    // Press `Ctrl + c`
    let _ = enigo.key(control_or_command, enigo::Direction::Press);
    let _ = enigo.key(enigo::Key::Unicode('c'), enigo::Direction::Click);
    let _ = enigo.key(control_or_command, enigo::Direction::Release);

    Ok(())
}

/// Sends `Ctrl + v` (Linux) to paste from the clipboard.
pub(crate) fn send_paste_shortcut_sync() -> Result<(), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).map_err(|e| e.to_string())?;

    let control_or_command = if cfg!(target_os = "macos") {
        enigo::Key::Meta
    } else {
        enigo::Key::Control
    };

    // Release all modifiers
    let _ = enigo.key(enigo::Key::Control, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Alt, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Shift, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Space, enigo::Direction::Release);    
    let _ = enigo.key(enigo::Key::Tab, enigo::Direction::Release);

    // Press `Ctrl + v`
    enigo
        .key(control_or_command, enigo::Direction::Press)
        .map_err(|e| e.to_string())?;
    enigo
        .key(enigo::Key::Unicode('v'), enigo::Direction::Click)
        .map_err(|e| e.to_string())?;
    enigo
        .key(control_or_command, enigo::Direction::Release)
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn select_all_sync() -> Result<(), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).map_err(|e| e.to_string())?;
    let modifier = if cfg!(target_os = "macos") {
        enigo::Key::Meta
    } else {
        enigo::Key::Control
    };
    enigo
        .key(modifier, enigo::Direction::Press)
        .map_err(|e| e.to_string())?;
    enigo
        .key(enigo::Key::Unicode('a'), enigo::Direction::Click)
        .map_err(|e| e.to_string())?;
    enigo
        .key(modifier, enigo::Direction::Release)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn select_all(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(), String>>(1);
        app.run_on_main_thread(move || {
            let _ = tx.send(select_all_sync());
        })
        .map_err(|e| e.to_string())?;
        tauri::async_runtime::spawn_blocking(move || match rx.recv() {
            Ok(r) => r,
            Err(_) => Err("select_all was cancelled".to_string()),
        })
        .await
        .map_err(|e| e.to_string())?
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        select_all_sync()
    }
}

pub fn type_text_sync(text: String, window: tauri::Window) -> Result<(), String> {
    if crate::in_linux_wayland() {
        return type_text_wayland(text, window);
    }

    let previous_clipboard = window.clipboard().read_text().unwrap_or_default();

    window
        .clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(50));

    send_paste_shortcut_sync().map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(50));

    if !previous_clipboard.is_empty() {
        let _ = window.clipboard().write_text(previous_clipboard);
    }

    Ok(())
}

fn type_text_wayland(text: String, window: tauri::Window) -> Result<(), String> {
    let previous_clipboard = window.clipboard().read_text().unwrap_or_default();
    window
        .clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(50));
    
    let paste_ok = wl_clipboard::copyq_paste();
    if !paste_ok {
        let ydotool_ok = wl_clipboard::ydotool_paste_shortcut();
        if !ydotool_ok {
            send_paste_shortcut_sync()
                .map_err(|e| format!("Failed to paste from clipboard (copyq+ydotool+enigo): {}", e))?;
        }
    }

    std::thread::sleep(std::time::Duration::from_millis(50));

    if !previous_clipboard.is_empty() {
        let _ = window.clipboard().write_text(previous_clipboard);
    }
    
    Ok(())
}


#[tauri::command]
pub async fn type_text(text: String, window: tauri::Window) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(), String>>(1);
        let window_for_task = window.clone();
        window
            .run_on_main_thread(move || {
                let _ = tx.send(type_text_sync(text, window_for_task));
            })
            .map_err(|e| e.to_string())?;
        tauri::async_runtime::spawn_blocking(move || match rx.recv() {
            Ok(r) => r,
            Err(_) => Err("type_text was cancelled".to_string()),
        })
        .await
        .map_err(|e| e.to_string())?
    }
    #[cfg(not(target_os = "macos"))]
    {
        tauri::async_runtime::spawn_blocking(move || type_text_sync(text, window))
            .await
            .map_err(|e| e.to_string())?
    }
}
