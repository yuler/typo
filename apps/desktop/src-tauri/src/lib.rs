use serde::Serialize;
#[cfg(target_os = "macos")]
use std::process::Command;
#[cfg(target_os = "macos")]
use std::path::{Path, PathBuf};
use tauri::Emitter;
use tauri_plugin_clipboard_manager::ClipboardExt;
use std::sync::{Mutex, OnceLock};

mod cli;
mod keyboard;
mod tray;

#[cfg(target_os = "macos")]
use macos_accessibility_client;

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

#[tauri::command]
fn cleanup_legacy_macos_login_item() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
tell application "System Events"
    if exists login item "typo" then
        delete login item "typo"
    end if
end tell
"#;

        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|error| format!("failed to run osascript: {}", error))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("failed to remove login item: {}", stderr.trim()));
        }

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(())
    }
}

#[cfg(target_os = "macos")]
fn escape_applescript_string(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

#[cfg(target_os = "macos")]
fn app_bundle_path(executable_path: &Path) -> PathBuf {
    executable_path
        .ancestors()
        .find(|ancestor| {
            ancestor
                .file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.ends_with(".app"))
        })
        .map(Path::to_path_buf)
        .unwrap_or_else(|| executable_path.to_path_buf())
}

#[tauri::command]
fn ensure_legacy_macos_login_item() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let executable_path = std::env::current_exe()
            .map_err(|error| format!("failed to resolve executable path: {}", error))?;
        let login_path = app_bundle_path(&executable_path);
        let escaped_path = escape_applescript_string(&login_path.to_string_lossy());

        let script = format!(
            r#"
tell application "System Events"
    if not (exists login item "typo") then
        make login item at end with properties {{name:"typo", path:"{}", hidden:true}}
    end if
end tell
"#,
            escaped_path
        );

        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|error| format!("failed to run osascript: {}", error))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("failed to create login item: {}", stderr.trim()));
        }

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(())
    }
}

#[derive(Serialize)]
struct SystemInfo {
    os: String,
    is_wayland: bool,
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    SystemInfo {
        os: std::env::consts::OS.to_string(),
        is_wayland: in_linux_wayland(),
    }
}

#[tauri::command]
async fn get_selected_text() -> Result<String, String> {
    let text = get_selected_text::get_selected_text().map_err(|e| e.to_string())?;
    Ok(text)
}

pub(crate) fn in_linux_wayland() -> bool {
    if !cfg!(target_os = "linux") {
        return false;
    }

    let wayland_display = std::env::var_os("WAYLAND_DISPLAY").is_some();
    let session_type = std::env::var("XDG_SESSION_TYPE").unwrap_or_default();
    wayland_display || session_type.eq_ignore_ascii_case("wayland")
}

#[derive(Clone, Serialize, serde::Deserialize)]
struct SetInputPayload {
    text: String,
    mode: String,
}

fn pending_selection_payload() -> &'static Mutex<Option<SetInputPayload>> {
    static PENDING_SELECTION_PAYLOAD: OnceLock<Mutex<Option<SetInputPayload>>> = OnceLock::new();
    PENDING_SELECTION_PAYLOAD.get_or_init(|| Mutex::new(None))
}

fn app_cli_selection_trigger(app: &tauri::AppHandle) {
    println!("app_cli_selection_trigger");

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
    // 1. Try ydotool first
    if keyboard::ydotool_copy_shortcut() {
        std::thread::sleep(std::time::Duration::from_millis(80));
        let text = app.clipboard().read_text().unwrap_or_default();
        if !text.is_empty() {
            return Some(text);
        }
    }

    // 2. Fallback to copyq selection
    if let Some(text) = keyboard::copyq_selection() {
        return Some(text);
    }

    None
}

fn get_selected_text_enigo(app: &tauri::AppHandle) -> Option<String> {
    keyboard::enigo_copy().ok()?;

    std::thread::sleep(std::time::Duration::from_millis(100));

    let text = app.clipboard().read_text().unwrap_or_default();
    if text.is_empty() { None } else { Some(text) }
}

fn app_cli_startup_selection_trigger(app: &tauri::AppHandle) {
    let text = if in_linux_wayland() {
        get_selected_text_wayland(app)
    } else {
        get_selected_text_enigo(app)
    };

    if let Some(text) = text {
        if let Ok(mut pending) = pending_selection_payload().lock() {
            *pending = Some(SetInputPayload {
                text,
                mode: "selected".to_string(),
            });
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
fn set_pending_selection_input(payload: SetInputPayload) {
    if let Ok(mut pending) = pending_selection_payload().lock() {
        *pending = Some(payload);
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
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--minimized"])))
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
                app_cli_selection_trigger,
            );
        }))
        .setup(move |app| {
            if let Err(error) = tray::init(app) {
                eprintln!("Failed to initialize system tray: {}", error);
            }
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            if startup_selection && in_linux_wayland() {
                app_cli_startup_selection_trigger(&app.handle());
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            request_mac_accessibility_permissions,
            cleanup_legacy_macos_login_item,
            ensure_legacy_macos_login_item,
            get_system_info,
            get_selected_text,
            set_pending_selection_input,
            keyboard::keyboard_select_all,
            keyboard::keyboard_paste_text,
            consume_pending_selection_input,
            tray::update_tray_menu,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
