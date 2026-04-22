use serde::Serialize;
use tauri::Manager;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};
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
            log::info!("application is totally trusted");
        } else {
            log::warn!("application is not trusted");
        }
        Ok(trusted)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(true)
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
    log::debug!("app_cli_selection_trigger");

    let text = if in_linux_wayland() {
        get_selected_text_wayland(app)
    } else {
        get_selected_text_enigo(app)
    };

    let Some(text) = text else { return };

    log::debug!("selected text: {}", text);
    let payload = SetInputPayload {
        text,
        mode: "selected".to_string(),
    };
    if let Err(error) = app.emit("set-input", payload) {
        log::error!("failed to emit set-input event: {}", error);
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
            log::error!("failed to access pending selection payload: {}", error);
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

fn log_plugin_builder() -> tauri_plugin_log::Builder {
    let builder = tauri_plugin_log::Builder::new()
        .timezone_strategy(TimezoneStrategy::UseLocal)
        .max_file_size(5 * 1024 * 1024)
        .rotation_strategy(RotationStrategy::KeepAll);

    if cfg!(debug_assertions) {
        builder
            .level(log::LevelFilter::Debug)
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::Webview),
            ])
    } else {
        builder
            .level(log::LevelFilter::Info)
            .targets([Target::new(TargetKind::LogDir {
                file_name: Some("typo".into()),
            })])
    }
}

fn cleanup_old_logs(app: &tauri::AppHandle) {
    let Ok(dir) = app.path().app_log_dir() else {
        return;
    };
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return;
    };

    let mut logs: Vec<(std::path::PathBuf, std::time::SystemTime)> = entries
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name()
                .to_string_lossy()
                .to_ascii_lowercase()
                .starts_with("typo")
                && e.file_name()
                    .to_string_lossy()
                    .to_ascii_lowercase()
                    .ends_with(".log")
        })
        .filter_map(|e| {
            let modified = e.metadata().ok()?.modified().ok()?;
            Some((e.path(), modified))
        })
        .collect();

    logs.sort_by(|a, b| b.1.cmp(&a.1));

    for (path, _) in logs.into_iter().skip(3) {
        if let Err(err) = std::fs::remove_file(&path) {
            log::warn!("failed to prune old log file {:?}: {}", path, err);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_selection = cli::has_selection_flag(std::env::args());

    log::info!("in_linux_wayland={}", in_linux_wayland());

    tauri::Builder::default()
        .plugin(log_plugin_builder().build())
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
            cleanup_old_logs(&app.handle());
            if let Err(error) = tray::init(app) {
                log::error!("failed to initialize system tray: {}", error);
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
