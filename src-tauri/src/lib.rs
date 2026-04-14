use enigo::Keyboard;
use serde::Serialize;
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_notification::NotificationExt;
use std::sync::{Mutex, OnceLock};

#[cfg(target_os = "macos")]
use macos_accessibility_client;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn get_selected_text(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
) -> Result<String, String> {
    if is_linux_wayland_session() {
        return capture_selection_with_feedback(&app, &window);
    }

    let text = get_selected_text::get_selected_text().map_err(|e| e.to_string())?;
    Ok(text)
}

fn select_all_sync() -> Result<(), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).map_err(|e| e.to_string())?;
    let modifier = if cfg!(target_os = "macos") {
        enigo::Key::Meta
    } else {
        enigo::Key::Control
    };
    enigo.key(modifier, enigo::Direction::Press).map_err(|e| e.to_string())?;
    enigo.key(enigo::Key::Unicode('a'), enigo::Direction::Click).map_err(|e| e.to_string())?;
    enigo.key(modifier, enigo::Direction::Release).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn select_all(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(), String>>(1);
        _app
            .run_on_main_thread(move || {
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
        select_all_sync()
    }
}

#[tauri::command]
async fn get_platform_info() -> Result<String, String> {
    Ok(std::env::consts::OS.to_string())
}

#[derive(Serialize)]
struct SessionInfo {
    os: String,
    is_wayland: bool,
}

#[tauri::command]
fn get_session_info() -> SessionInfo {
    SessionInfo {
        os: std::env::consts::OS.to_string(),
        is_wayland: is_linux_wayland_session(),
    }
}

fn is_linux_wayland_session() -> bool {
    if !cfg!(target_os = "linux") {
        return false;
    }

    let wayland_display = std::env::var_os("WAYLAND_DISPLAY").is_some();
    let session_type = std::env::var("XDG_SESSION_TYPE").unwrap_or_default();
    wayland_display || session_type.eq_ignore_ascii_case("wayland")
}

fn notify_selection_capture_failure(app: &tauri::AppHandle, message: &str) {
    if let Err(error) = app
        .notification()
        .builder()
        .title("Typo")
        .body(message)
        .show()
    {
        eprintln!("Failed to show selection capture notification: {}", error);
    }
}

fn copy_selection_and_read_clipboard(window: &tauri::WebviewWindow) -> Result<String, String> {
    let copy_failure_message =
        "Failed to trigger Ctrl+C. Make sure the target app supports Ctrl+C.".to_string();
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).map_err(|error| {
        eprintln!("Failed to create enigo input context: {}", error);
        copy_failure_message.clone()
    })?;
    enigo.key(enigo::Key::Control, enigo::Direction::Press).map_err(
        |error| {
            eprintln!("Failed to press Ctrl key for copy: {}", error);
            copy_failure_message.clone()
        },
    )?;
    enigo.key(enigo::Key::Unicode('c'), enigo::Direction::Click).map_err(
        |error| {
            eprintln!("Failed to send C key for copy: {}", error);
            copy_failure_message.clone()
        },
    )?;
    enigo.key(enigo::Key::Control, enigo::Direction::Release).map_err(
        |error| {
            eprintln!("Failed to release Ctrl key after copy: {}", error);
            copy_failure_message.clone()
        },
    )?;

    let text = window
        .clipboard()
        .read_text()
        .map_err(|error| {
            eprintln!("Failed to read clipboard text: {}", error);
            "Failed to read clipboard text.".to_string()
        })?;

    if text.trim().is_empty() {
        return Err(
            "No selected text captured. Make sure the target app supports Ctrl+C.".to_string(),
        );
    }

    Ok(text)
}

fn capture_selection_with_feedback(
    app: &tauri::AppHandle,
    window: &tauri::WebviewWindow,
) -> Result<String, String> {
    match copy_selection_and_read_clipboard(window) {
        Ok(text) => Ok(text),
        Err(message) => {
            notify_selection_capture_failure(app, &message);
            Err(message)
        }
    }
}

#[derive(Clone, Serialize)]
struct SetInputPayload {
    text: String,
    mode: String,
}

fn pending_selection_payload() -> &'static Mutex<Option<SetInputPayload>> {
    static PENDING_SELECTION_PAYLOAD: OnceLock<Mutex<Option<SetInputPayload>>> = OnceLock::new();
    PENDING_SELECTION_PAYLOAD.get_or_init(|| Mutex::new(None))
}

fn capture_selection_payload(app: &tauri::AppHandle) -> Option<SetInputPayload> {
    let Some(window) = app.get_webview_window("main") else {
        eprintln!("Main window not found for selection trigger");
        return None;
    };

    match capture_selection_with_feedback(app, &window) {
        Ok(text) => Some(SetInputPayload {
            text,
            mode: "selected".to_string(),
        }),
        Err(error) => {
            eprintln!("Selection trigger failed: {}", error);
            None
        }
    }
}

fn handle_selection_trigger(app: &tauri::AppHandle) {
    if let Some(payload) = capture_selection_payload(app) {
        if let Err(error) = app.emit("set-input", payload) {
            eprintln!("Failed to emit set-input event: {}", error);
        }
    }
}

fn handle_startup_selection_trigger(app: &tauri::AppHandle) {
    if let Some(payload) = capture_selection_payload(app) {
        if let Ok(mut pending) = pending_selection_payload().lock() {
            *pending = Some(payload);
        }
    }
}

#[tauri::command]
fn consume_pending_selection_input() -> Option<SetInputPayload> {
    match pending_selection_payload().lock() {
        Ok(mut pending) => pending.take(),
        Err(error) => {
            eprintln!("Failed to access pending selection payload: {}", error);
            None
        }
    }
}

#[tauri::command]
fn request_mac_accessibility_permissions() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        let trusted =
            macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
        if trusted {
            print!("Application is totally trusted!");
        } else {
            print!("Application isn't trusted :(");
        }
        Ok(trusted)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(true)
    }
}

fn type_text_sync(text: String, window: tauri::Window) -> Result<(), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).map_err(|e| e.to_string())?;

    // 1. Save current clipboard content to restore later
    let previous_clipboard = window.clipboard().read_text().unwrap_or_default();

    // 2. Write the new text to the clipboard
    window
        .clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    // Small delay to ensure clipboard is updated
    std::thread::sleep(std::time::Duration::from_millis(50));

    // 3. Ctrl/Cmd + V to paste text
    let control_or_command = if cfg!(target_os = "macos") {
        enigo::Key::Meta
    } else {
        enigo::Key::Control
    };
    enigo
        .key(control_or_command, enigo::Direction::Press)
        .map_err(|e| e.to_string())?;
    enigo
        .key(enigo::Key::Unicode('v'), enigo::Direction::Click)
        .map_err(|e| e.to_string())?;
    enigo
        .key(control_or_command, enigo::Direction::Release)
        .map_err(|e| e.to_string())?;

    // 4. Small delay to ensure paste is completed before restoring clipboard
    std::thread::sleep(std::time::Duration::from_millis(50));

    // 5. Restore previous clipboard
    if !previous_clipboard.is_empty() {
        let _ = window.clipboard().write_text(previous_clipboard);
    }

    Ok(())
}

#[tauri::command]
async fn type_text(text: String, window: tauri::Window) -> Result<(), String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_selection = std::env::args().any(|arg| arg == "--selection");

    println!(
        "is_linux_wayland_session={}",
        is_linux_wayland_session()
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let selection_requested = argv.iter().any(|arg| arg == "--selection");
            if selection_requested && is_linux_wayland_session() {
                handle_selection_trigger(app);
                return;
            }
            app.notification()
                .builder()
                .title("This app is already running!")
                .body("You can find it in the tray menu.")
                .show()
                .unwrap();
        }))
        .setup(move |app| {
            if startup_selection && is_linux_wayland_session() {
                handle_startup_selection_trigger(&app.handle());
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_selected_text,
            select_all,
            type_text,
            get_platform_info,
            get_session_info,
            consume_pending_selection_input,
            request_mac_accessibility_permissions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
