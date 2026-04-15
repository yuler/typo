use serde::Serialize;
use tauri::Emitter;
use tauri_plugin_clipboard_manager::ClipboardExt;
use std::sync::{Mutex, OnceLock};

mod cli;
mod keyboard;
mod wl_clipboard;

#[cfg(target_os = "macos")]
use macos_accessibility_client;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn get_selected_text() -> Result<String, String> {
    let text = get_selected_text::get_selected_text().map_err(|e| e.to_string())?;
    Ok(text)
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
        is_wayland: in_linux_wayland(),
    }
}

pub(crate) fn in_linux_wayland() -> bool {
    if !cfg!(target_os = "linux") {
        return false;
    }

    let wayland_display = std::env::var_os("WAYLAND_DISPLAY").is_some();
    let session_type = std::env::var("XDG_SESSION_TYPE").unwrap_or_default();
    wayland_display || session_type.eq_ignore_ascii_case("wayland")
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

fn handle_selection_trigger(app: &tauri::AppHandle) {
    println!("handle_selection_trigger");

    let text = if in_linux_wayland() {
        get_selected_text_wayland(app)
    } else {
        get_selected_text_enigo(app)
    };

    let Some(text) = text else { return };

    println!("text: {}", text);
    let payload = SetInputPayload {
        text,
        mode: "selected".to_string(),
    };
    if let Err(error) = app.emit("set-input", payload) {
        eprintln!("Failed to emit set-input event: {}", error);
    }
}

fn get_selected_text_wayland(app: &tauri::AppHandle) -> Option<String> {
    // TODO: Try native shortcut first. If compositor blocks it, fallback to ydotool.
    // let _ = keyboard::send_copy_shortcut_sync();
    // std::thread::sleep(std::time::Duration::from_millis(80));
    // if let Some(text) = wl_clipboard::copyq_selection() {
    //     return Some(text);
    // }

    if wl_clipboard::ydotool_copy_shortcut() {
        std::thread::sleep(std::time::Duration::from_millis(80));
        let text = app.clipboard().read_text().unwrap_or_default();
        if text.is_empty() { return None }
        return Some(text);
    }

    None
}

fn get_selected_text_enigo(app: &tauri::AppHandle) -> Option<String> {
    keyboard::send_copy_shortcut_sync().ok()?;

    std::thread::sleep(std::time::Duration::from_millis(100));

    let text = app.clipboard().read_text().unwrap_or_default();
    if text.is_empty() { None } else { Some(text) }
}

fn handle_startup_selection_trigger(_app: &tauri::AppHandle) {
    
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_selection = cli::has_selection_flag(std::env::args());

    println!(
        "in_linux_wayland={}",
        in_linux_wayland()
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
            cli::handle_single_instance_event(
                app,
                &argv,
                in_linux_wayland(),
                handle_selection_trigger,
            );
        }))
        .setup(move |app| {
            if startup_selection && in_linux_wayland() {
                handle_startup_selection_trigger(&app.handle());
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_selected_text,
            keyboard::select_all,
            keyboard::type_text,
            get_platform_info,
            get_session_info,
            consume_pending_selection_input,
            request_mac_accessibility_permissions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
