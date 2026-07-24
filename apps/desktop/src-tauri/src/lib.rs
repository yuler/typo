use serde::Serialize;
use tauri::Manager;
use tauri::Emitter;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_opener::OpenerExt;
use std::sync::{Mutex, OnceLock};

mod autostart;
mod cli;
mod keyboard;
mod logging;
mod quick_pick;
mod tray;
mod upgrade;
mod windows;

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
    version: String,
    is_wayland: bool,
}

#[tauri::command]
fn get_system_info(app: tauri::AppHandle) -> SystemInfo {
    SystemInfo {
        os: std::env::consts::OS.to_string(),
        version: app.package_info().version.to_string(),
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
pub(crate) struct SetInputPayload {
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

/// Sentinel written before simulated Ctrl+C so we can tell "copy failed,
/// clipboard unchanged" from "copy succeeded". Without this, a failed Ctrl+C
/// (e.g. Shift still held from Ctrl+Shift+X) returns the *previous* clipboard
/// as if it were the selection.
const SELECTION_CLIPBOARD_SENTINEL: &str = "\u{FEFF}\u{200B}typo-sel\u{200B}";

pub(crate) fn get_selected_text_wayland(app: &tauri::AppHandle) -> Option<String> {
    // 1. Ctrl+C via ydotool, reject stale clipboard with a sentinel.
    let previous_clipboard = app.clipboard().read_text().unwrap_or_default();
    let _ = app
        .clipboard()
        .write_text(SELECTION_CLIPBOARD_SENTINEL.to_string());
    std::thread::sleep(std::time::Duration::from_millis(40));

    if keyboard::ydotool_copy_shortcut() {
        std::thread::sleep(std::time::Duration::from_millis(100));
        let text = app.clipboard().read_text().unwrap_or_default();
        if !text.is_empty() && text != SELECTION_CLIPBOARD_SENTINEL {
            if !previous_clipboard.is_empty() {
                let _ = app.clipboard().write_text(previous_clipboard);
            }
            return Some(text);
        }
    }

    if !previous_clipboard.is_empty() {
        let _ = app.clipboard().write_text(previous_clipboard);
    }

    // 2. Wayland primary selection (highlighted text; no Ctrl+C needed)
    if let Some(text) = keyboard::wl_paste_primary() {
        return Some(text);
    }

    // 3. Fallback to copyq selection
    // TODO: remove this
    if let Some(text) = keyboard::copyq_selection() {
        return Some(text);
    }

    None
}

pub(crate) fn get_selected_text_enigo(app: &tauri::AppHandle) -> Option<String> {
    keyboard::enigo_copy(app).ok()?;

    std::thread::sleep(std::time::Duration::from_millis(100));

    let text = app.clipboard().read_text().unwrap_or_default();
    if text.is_empty() {
        None
    } else {
        Some(text)
    }
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

pub(crate) fn desktop_log_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_log_dir()
        .map_err(|err| format!("failed to resolve app log dir: {err}"))
}

pub(crate) fn open_log_folder_inner(app: &tauri::AppHandle) -> Result<(), String> {
    let dir = desktop_log_dir(app)?;

    std::fs::create_dir_all(&dir)
        .map_err(|err| format!("failed to create log dir {}: {err}", dir.display()))?;

    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|err| format!("failed to open log folder {}: {err}", dir.display()))?;

    log::info!("opened log folder: {}", dir.display());
    Ok(())
}

#[tauri::command]
fn open_log_folder(app: tauri::AppHandle) -> Result<(), String> {
    open_log_folder_inner(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_selection = cli::has_selection_flag(std::env::args());
    let startup_quick_pick = cli::has_quick_pick_flag(std::env::args());

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(logging::log_plugin_builder().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
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
                quick_pick::app_cli_quick_pick_trigger,
            );
        }))
        .setup(move |app| {
            if startup_quick_pick {
                quick_pick::store_pending_cli_quick_pick();
            }

            log::info!("in_linux_wayland={}", in_linux_wayland());
            upgrade::init(app.handle().clone());
            windows::create_main_window(&app.handle());
            windows::create_indicator_window(&app.handle(), false);
            windows::preload_quick_pick_windows(&app.handle());
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
            autostart::cleanup_legacy_macos_login_item,
            autostart::ensure_legacy_macos_login_item,
            autostart::is_legacy_macos_login_item_enabled,
            autostart::is_autostart_enabled,
            autostart::set_autostart,
            get_system_info,
            get_selected_text,
            set_pending_selection_input,
            quick_pick::set_quick_pick_input,
            quick_pick::get_local_slash_prompts,
            quick_pick::get_local_ai_provider,
            quick_pick::get_local_locale,
            open_log_folder,
            keyboard::keyboard_select_all,
            keyboard::keyboard_paste_text,
            consume_pending_selection_input,
            quick_pick::consume_quick_pick_input,
            quick_pick::consume_quick_pick_selection,
            quick_pick::open_quick_pick_with_selection,
            quick_pick::notify_quick_pick_window_ready,
            quick_pick::capture_quick_pick_selection,
            windows::consume_pending_open_settings,
            tray::update_tray_menu,
            windows::open_upgrade_window,
            upgrade::open_forced_upgrade_window,
            upgrade::is_forced_upgrade,
            windows::open_indicator_window,
            windows::open_main_window,
            windows::open_quick_pick_window,
            windows::get_cursor_position,
            upgrade::ignore_version,
            upgrade::increment_activity,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
