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

fn enigo_copy_raw() -> Result<(), String> {
    let (mut enigo, modifier) = new_enigo()?;

    let _ = enigo.key(modifier, enigo::Direction::Press);
    let _ = enigo.key(enigo::Key::Unicode('c'), enigo::Direction::Click);
    let _ = enigo.key(modifier, enigo::Direction::Release);

    Ok(())
}

/// Sends `Ctrl + c` (Linux/Windows) or `Cmd + c` (macOS) to copy the current selection.
pub(crate) fn enigo_copy(app: &tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn pthread_main_np() -> std::os::raw::c_int;
        }
        let is_main_thread = unsafe { pthread_main_np() == 1 };

        if is_main_thread {
            enigo_copy_raw()
        } else {
            let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(), String>>(1);
            app.run_on_main_thread(move || {
                let _ = tx.send(enigo_copy_raw());
            })
            .map_err(|e| e.to_string())?;

            rx.recv().unwrap_or_else(|_| Err("Copy failed".into()))
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        enigo_copy_raw()
    }
}

/// Sends `Ctrl + v` (Linux/Windows) or `Cmd + v` (macOS) to paste from the clipboard.
pub(crate) fn enigo_paste() -> Result<(), String> {
    let (mut enigo, modifier) = new_enigo()?;

    let _ = enigo.key(modifier, enigo::Direction::Press);
    let _ = enigo.key(enigo::Key::Unicode('v'), enigo::Direction::Click);
    let _ = enigo.key(modifier, enigo::Direction::Release);

    Ok(())
}

/// Sends `Ctrl + a` (Linux/Windows) or `Cmd + a` (macOS) to select all.
pub fn enigo_select_all() -> Result<(), String> {
    let (mut enigo, modifier) = new_enigo()?;

    let _ = enigo.key(modifier, enigo::Direction::Press);
    let _ = enigo.key(enigo::Key::Unicode('a'), enigo::Direction::Click);
    let _ = enigo.key(modifier, enigo::Direction::Release);

    Ok(())
}

pub fn _enigo_paste_text(text: String, window: tauri::Window) -> Result<(), String> {
    if crate::in_linux_wayland() {
        return keyboard_paste_text_wayland(text, window);
    }

    let previous_clipboard = window.clipboard().read_text().unwrap_or_default();

    window
        .clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(50));

    enigo_paste().map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(50));

    if !previous_clipboard.is_empty() {
        let _ = window.clipboard().write_text(previous_clipboard);
    }

    Ok(())
}

/// `wl-paste --primary` — Wayland primary selection (highlighted text).
pub fn wl_paste_primary() -> Option<String> {
    let output = Command::new("wl-paste")
        .args(["--primary", "--no-newline"])
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

// Linux input-event-codes.h — used by ydotool 1.0+ (`keycode:pressed`).
const KEY_C: u16 = 46;
const KEY_V: u16 = 47;
const KEY_LEFTCTRL: u16 = 29;
const KEY_LEFTSHIFT: u16 = 42;
const KEY_LEFTALT: u16 = 56;

fn ydotool_key(key_events: &[&str]) -> bool {
    Command::new("ydotool")
        .arg("key")
        .args(key_events)
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn ydotool_chord(events: &[(u16, u8)]) -> bool {
    let args: Vec<String> = events
        .iter()
        .map(|(code, pressed)| format!("{code}:{pressed}"))
        .collect();
    let refs: Vec<&str> = args.iter().map(String::as_str).collect();
    ydotool_key(&refs)
}

/// Release modifiers that may still be held from the system hotkey
/// (e.g. Ctrl+Shift+X) so the following Ctrl+C/V is not Ctrl+Shift+C/V.
fn ydotool_release_modifiers() {
    let _ = ydotool_chord(&[
        (KEY_LEFTCTRL, 0),
        (KEY_LEFTSHIFT, 0),
        (KEY_LEFTALT, 0),
    ]);
}

/// Trigger Ctrl+C on Wayland via ydotool.
///
/// Prefers ydotool 1.0+ raw keycodes (Arch / recent distros). Falls back to
/// the legacy named-key syntax (`CTRL+c`) used by older Ubuntu packages.
/// Note: on ydotool 1.0+, `CTRL+c` is a no-op that still exits 0, so keycodes
/// must be tried first.
pub fn ydotool_copy_shortcut() -> bool {
    ydotool_release_modifiers();
    // Let the compositor drop the system hotkey modifiers before Ctrl+C.
    std::thread::sleep(std::time::Duration::from_millis(50));

    if ydotool_chord(&[
        (KEY_LEFTCTRL, 1),
        (KEY_C, 1),
        (KEY_C, 0),
        (KEY_LEFTCTRL, 0),
    ]) {
        return true;
    }

    ydotool_key(&["CTRL+c"])
}

/// Trigger Ctrl+V on Wayland via ydotool (same keycode / legacy fallback as copy).
pub fn ydotool_paste_shortcut() -> bool {
    ydotool_release_modifiers();

    if ydotool_chord(&[
        (KEY_LEFTCTRL, 1),
        (KEY_V, 1),
        (KEY_V, 0),
        (KEY_LEFTCTRL, 0),
    ]) {
        return true;
    }

    ydotool_key(&["CTRL+v"])
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
            enigo_paste().map_err(|e| {
                format!(
                    "Failed to paste from clipboard (copyq+ydotool+enigo): {}",
                    e
                )
            })?;
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
            let _ = tx.send(enigo_select_all());
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
        tauri::async_runtime::spawn_blocking(move || enigo_select_all())
            .await
            .map_err(|e| e.to_string())?
    }
}

#[tauri::command]
pub async fn keyboard_paste_text(text: String, window: tauri::Window) -> Result<(), String> {
    if crate::in_linux_wayland() {
        return tauri::async_runtime::spawn_blocking(move || {
            keyboard_paste_text_wayland(text, window)
        })
        .await
        .map_err(|e| e.to_string())?;
    }

    let previous_clipboard = window.clipboard().read_text().unwrap_or_default();

    window
        .clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    // On macOS, enigo MUST run on the main thread.
    // We use async sleep and only dispatch the actual enigo call to the main thread
    // to avoid stuttering.
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;

    #[cfg(target_os = "macos")]
    {
        let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(), String>>(1);
        window
            .run_on_main_thread(move || {
                let _ = tx.send(enigo_paste());
            })
            .map_err(|e| e.to_string())?;

        tauri::async_runtime::spawn_blocking(move || {
            rx.recv().unwrap_or(Err("Paste failed".into()))
        })
        .await
        .map_err(|e| e.to_string())??;
    }

    #[cfg(not(target_os = "macos"))]
    {
        tauri::async_runtime::spawn_blocking(move || enigo_paste())
            .await
            .map_err(|e| e.to_string())??;
    }

    tokio::time::sleep(std::time::Duration::from_millis(50)).await;

    if !previous_clipboard.is_empty() {
        let _ = window.clipboard().write_text(previous_clipboard);
    }

    Ok(())
}
