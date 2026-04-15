use enigo::Keyboard;
use tauri_plugin_clipboard_manager::ClipboardExt;

use std::process::{Command, Stdio};

/// Create a new Enigo instance, release all modifier keys, and return the
/// platform modifier (`Meta` on macOS, `Control` elsewhere).
fn new_enigo() -> Result<(enigo::Enigo, enigo::Key), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).map_err(|e| e.to_string())?;
    let modifier = if cfg!(target_os = "macos") {
        enigo::Key::Meta
    } else {
        enigo::Key::Control
    };

    let _ = enigo.key(enigo::Key::Control, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Alt, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Shift, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Space, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Tab, enigo::Direction::Release);

    Ok((enigo, modifier))
}

/// Sends `Ctrl + c` (Linux/Windows) or `Cmd + c` (macOS) to copy the current selection.
pub(crate) fn engio_copy() -> Result<(), String> {
    let (mut enigo, modifier) = new_enigo()?;

    let _ = enigo.key(modifier, enigo::Direction::Press);
    let _ = enigo.key(enigo::Key::Unicode('c'), enigo::Direction::Click);
    let _ = enigo.key(modifier, enigo::Direction::Release);

    Ok(())
}

/// Sends `Ctrl + v` (Linux/Windows) or `Cmd + v` (macOS) to paste from the clipboard.
pub(crate) fn engio_paste() -> Result<(), String> {
    let (mut enigo, modifier) = new_enigo()?;

    let _ = enigo.key(modifier, enigo::Direction::Press);
    let _ = enigo.key(enigo::Key::Unicode('v'), enigo::Direction::Click);
    let _ = enigo.key(modifier, enigo::Direction::Release);

    Ok(())
}

/// Sends `Ctrl + a` (Linux/Windows) or `Cmd + a` (macOS) to select all.
pub fn engio_select_all() -> Result<(), String> {
    let (mut enigo, modifier) = new_enigo()?;

    let _ = enigo.key(modifier, enigo::Direction::Press);
    let _ = enigo.key(enigo::Key::Unicode('a'), enigo::Direction::Click);
    let _ = enigo.key(modifier, enigo::Direction::Release);

    Ok(())
}

pub fn enigo_paste_text(text: String, window: tauri::Window) -> Result<(), String> {
    if crate::in_linux_wayland() {
        return keyboard_paste_text_wayland(text, window);
    }

    let previous_clipboard = window.clipboard().read_text().unwrap_or_default();

    window
        .clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(50));

    engio_paste().map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(50));

    if !previous_clipboard.is_empty() {
        let _ = window.clipboard().write_text(previous_clipboard);
    }

    Ok(())
}

/// `copyq selection`
pub fn copyq_selection() -> Option<String> {
    ensure_copyq_server_start();
    let output = Command::new("copyq")
        .args(["selection", "text/plain"])
        .stderr(Stdio::null())
        .output()
        .ok()?;

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).to_string();
        if !text.is_empty() {
            return Some(text);
        }
    }
    None
}

/// `copyq --start-server`
pub fn ensure_copyq_server_start() -> bool {
    Command::new("copyq")
        .arg("--start-server")
        .stderr(Stdio::null())
        .stdout(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

/// `copyq paste`
pub fn copyq_paste() -> bool {
    let output = Command::new("copyq")
        .arg("paste")
        .stderr(Stdio::piped())
        .output();
    match output {
        Ok(output) => output.status.success(),
        Err(_) => false,
    }
}

/// `ydotool key Ctrl + c` to trigger copy shortcut on Wayland.
pub fn ydotool_copy_shortcut() -> bool {
    let ctrl_c = Command::new("ydotool")
        .args(["key", "CTRL+c"])
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .output();

    let Ok(ctrl_c_output) = ctrl_c else {
        return false;
    };

    ctrl_c_output.status.success()
}

/// `ydotool key Ctrl+v` to trigger paste shortcuts on Wayland.
pub fn ydotool_paste_shortcut() -> bool {
    let ctrl_v = Command::new("ydotool")
        .args(["key", "CTRL+v"])
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .output();

    let Ok(ctrl_v_output) = ctrl_v else {
        return false;
    };

    ctrl_v_output.status.success()
}


fn keyboard_paste_text_wayland(text: String, window: tauri::Window) -> Result<(), String> {
    let previous_clipboard = window.clipboard().read_text().unwrap_or_default();
    window
        .clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(50));

    let paste_ok = copyq_paste();
    if !paste_ok {
        let ydotool_ok = ydotool_paste_shortcut();
        if !ydotool_ok {
            engio_paste()
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
pub async fn keyboard_select_all(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(), String>>(1);
        app.run_on_main_thread(move || {
            let _ = tx.send(engio_select_all());
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
        engio_select_all()
    }
}

#[tauri::command]
pub async fn keyboard_paste_text(text: String, window: tauri::Window) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(), String>>(1);
        let window_for_task = window.clone();
        window
            .run_on_main_thread(move || {
                let _ = tx.send(enigo_paste_text(text, window_for_task));
            })
            .map_err(|e| e.to_string())?;
        tauri::async_runtime::spawn_blocking(move || match rx.recv() {
            Ok(r) => r,
            Err(_) => Err("keyboard_paste_text was cancelled".to_string()),
        })
        .await
        .map_err(|e| e.to_string())?
    }
    #[cfg(not(target_os = "macos"))]
    {
        tauri::async_runtime::spawn_blocking(move || enigo_paste_text(text, window))
            .await
            .map_err(|e| e.to_string())?
    }
}

