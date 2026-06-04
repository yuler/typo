use crate::{
    get_selected_text_enigo, get_selected_text_wayland, in_linux_wayland, SetInputPayload,
};
use crate::windows::get_cursor_position;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use tauri::{
    AppHandle, Emitter, LogicalPosition, Manager, Position, WebviewUrl, WebviewWindowBuilder,
    WindowEvent,
};
use tauri_plugin_store::StoreExt;

const VALID_LOCALES: [&str; 3] = ["en", "zh", "jp"];

fn quick_pick_payload() -> &'static Mutex<Option<SetInputPayload>> {
    static QUICK_PICK_PAYLOAD: OnceLock<Mutex<Option<SetInputPayload>>> = OnceLock::new();
    QUICK_PICK_PAYLOAD.get_or_init(|| Mutex::new(None))
}

fn quick_pick_selection() -> &'static Mutex<Option<String>> {
    static QUICK_PICK_SELECTION: OnceLock<Mutex<Option<String>>> = OnceLock::new();
    QUICK_PICK_SELECTION.get_or_init(|| Mutex::new(None))
}

fn pending_cli_quick_pick() -> &'static AtomicBool {
    static PENDING_CLI_QUICK_PICK: OnceLock<AtomicBool> = OnceLock::new();
    PENDING_CLI_QUICK_PICK.get_or_init(|| AtomicBool::new(false))
}

pub fn store_pending_cli_quick_pick() {
    pending_cli_quick_pick().store(true, Ordering::SeqCst);
}

fn set_quick_pick_selection(text: String) {
    if let Ok(mut selection) = quick_pick_selection().lock() {
        *selection = Some(text);
    }
}

#[tauri::command]
pub fn consume_quick_pick_selection() -> Option<String> {
    match quick_pick_selection().lock() {
        Ok(mut selection) => selection.take(),
        Err(error) => {
            log::error!("failed to access quick pick selection: {}", error);
            None
        }
    }
}

#[tauri::command]
pub fn capture_quick_pick_selection(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let app_clone = app.clone();
        let text = tauri::async_runtime::spawn_blocking(move || {
            let captured = if in_linux_wayland() {
                get_selected_text_wayland(&app_clone)
            } else {
                get_selected_text_enigo(&app_clone)
            };
            captured.filter(|value| !value.trim().is_empty())
        })
        .await
        .unwrap_or(None);

        if let Some(ref val) = text {
            set_quick_pick_selection(val.clone());
        }

        if let Some(window) = app.get_webview_window("quick-pick") {
            let _ = window.emit("quick-pick-selection-captured", text);
        }
    });
}

#[tauri::command]
pub fn open_quick_pick_with_selection(app: tauri::AppHandle, text: Option<String>) -> bool {
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Some(val) = text.filter(|value| !value.trim().is_empty()) {
            set_quick_pick_selection(val.clone());
            open_quick_pick_window(app_clone.clone());
            if let Some(window) = app_clone.get_webview_window("quick-pick") {
                let _ = window.emit("quick-pick-selection-captured", Some(val));
            }
        } else {
            let captured_text = tauri::async_runtime::spawn_blocking(move || {
                let captured = if in_linux_wayland() {
                    get_selected_text_wayland(&app_clone)
                } else {
                    get_selected_text_enigo(&app_clone)
                };
                captured.filter(|value| !value.trim().is_empty())
            })
            .await
            .unwrap_or(None);

            if let Some(ref val) = captured_text {
                set_quick_pick_selection(val.clone());
            } else if let Ok(mut sel) = quick_pick_selection().lock() {
                *sel = None;
            }

            open_quick_pick_window(app.clone());

            if let Some(window) = app.get_webview_window("quick-pick") {
                let _ = window.emit("quick-pick-selection-captured", captured_text);
            }
        }
    });
    true
}

pub fn app_cli_quick_pick_trigger(app: &tauri::AppHandle) {
    log::debug!("app_cli_quick_pick_trigger");
    open_quick_pick_with_selection(app.clone(), None);
}

#[tauri::command]
pub fn notify_quick_pick_window_ready(app: tauri::AppHandle) {
    if pending_cli_quick_pick().swap(false, Ordering::SeqCst) {
        app_cli_quick_pick_trigger(&app);
    }
}

#[tauri::command]
pub fn consume_quick_pick_input() -> Option<SetInputPayload> {
    match quick_pick_payload().lock() {
        Ok(mut pending) => pending.take(),
        Err(error) => {
            log::error!("failed to access quick pick payload: {}", error);
            None
        }
    }
}

#[tauri::command]
pub fn set_quick_pick_input(payload: SetInputPayload) {
    if let Ok(mut pending) = quick_pick_payload().lock() {
        *pending = Some(payload);
    }
}

#[tauri::command]
pub fn get_local_locale(app: tauri::AppHandle) -> Result<String, String> {
    let store = app
        .store("settings.json")
        .map_err(|error| format!("failed to open settings store: {error}"))?;

    let locale = store
        .get("locale")
        .and_then(|value| value.as_str().map(|value| value.to_string()))
        .unwrap_or_else(|| "en".to_string());

    if VALID_LOCALES.contains(&locale.as_str()) {
        Ok(locale)
    } else {
        Ok("en".to_string())
    }
}

#[tauri::command]
pub fn get_local_slash_prompts(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let store = app
        .store("settings.json")
        .map_err(|error| format!("failed to open settings store: {error}"))?;

    let Some(value) = store.get("slash_prompts") else {
        return Ok(Vec::new());
    };

    let prompts = value.as_array().cloned().unwrap_or_default();
    Ok(prompts)
}

#[tauri::command]
pub fn get_local_ai_provider(app: tauri::AppHandle) -> Result<String, String> {
    let store = app
        .store("settings.json")
        .map_err(|error| format!("failed to open settings store: {error}"))?;

    let ai_provider = store
        .get("ai_provider")
        .and_then(|value| value.as_str().map(|value| value.to_string()))
        .unwrap_or_else(|| "typo".to_string());

    Ok(ai_provider)
}

#[tauri::command]
pub fn open_quick_pick_window(app: AppHandle) {
    create_quick_pick_window(&app);
}

#[tauri::command]
pub fn open_quick_pick_result_window(app: AppHandle) {
    create_quick_pick_result_window(&app);
}

pub fn preload_quick_pick_windows(app: &AppHandle) {
    create_quick_pick_floating_window(app, "quick-pick", "typo - Quick Pick", 500.0, 300.0, false);
    create_quick_pick_floating_window(
        app,
        "quick-pick-result",
        "typo - Quick Pick Result",
        480.0,
        360.0,
        false,
    );
}

pub fn create_quick_pick_window(app: &AppHandle) {
    create_quick_pick_floating_window(app, "quick-pick", "typo - Quick Pick", 500.0, 300.0, true);
}

pub fn create_quick_pick_result_window(app: &AppHandle) {
    create_quick_pick_floating_window(
        app,
        "quick-pick-result",
        "typo - Quick Pick Result",
        480.0,
        360.0,
        true,
    );
}

fn create_quick_pick_floating_window(
    app: &AppHandle,
    label: &str,
    title: &str,
    win_width: f64,
    win_height: f64,
    show: bool,
) {
    if let Some(window) = app.get_webview_window(label) {
        if show {
            let (x, y) = quick_pick_window_position(app, win_width, win_height);
            if let Err(err) = window.set_position(Position::Logical(LogicalPosition::new(x, y))) {
                log::error!("failed to position {} window: {}", label, err);
            }
            if let Err(err) = window.show() {
                log::error!("failed to show {} window: {}", label, err);
            }
            if let Err(err) = window.set_focus() {
                log::error!("failed to focus {} window: {}", label, err);
            }
            let opened_event = if label == "quick-pick" {
                "quick-pick-window-opened"
            } else {
                "quick-pick-result-window-opened"
            };
            if let Err(err) = window.emit(opened_event, ()) {
                log::error!("failed to emit {} for {} window: {}", opened_event, label, err);
            }
        }
        return;
    }

    let (x, y) = if show {
        quick_pick_window_position(app, win_width, win_height)
    } else {
        (0.0, 0.0)
    };

    let window = match WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title(title)
        .inner_size(win_width, win_height)
        .position(x, y)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible_on_all_workspaces(true)
        .visible(show)
        .build()
    {
        Ok(window) => window,
        Err(e) => {
            log::error!("failed to build {} window: {}", label, e);
            return;
        }
    };

    if show {
        if let Err(err) = window.show() {
            log::error!("failed to show {} window: {}", label, err);
        }
        if let Err(err) = window.set_focus() {
            log::error!("failed to focus {} window: {}", label, err);
        }
    }

    let label_for_close = label.to_string();
    let window_for_close = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            if let Err(err) = window_for_close.hide() {
                log::error!("failed to hide {} window: {}", label_for_close, err);
            }
        }
    });
}

fn quick_pick_window_position(app: &AppHandle, win_width: f64, win_height: f64) -> (f64, f64) {
    let (cursor_x, cursor_y) = {
        let pos = get_cursor_position();
        (pos.0 as f64, pos.1 as f64)
    };

    let monitor = app
        .available_monitors()
        .ok()
        .and_then(|monitors: Vec<tauri::Monitor>| {
            monitors.into_iter().find(|m: &tauri::Monitor| {
                let pos = m.position();
                let size = m.size();
                let scale = m.scale_factor();
                let scale = if scale <= 0.0 { 1.0 } else { scale };

                let (px, py) = if cfg!(target_os = "macos") {
                    (cursor_x * scale, cursor_y * scale)
                } else {
                    (cursor_x, cursor_y)
                };

                px >= pos.x as f64
                    && px <= (pos.x + size.width as i32) as f64
                    && py >= pos.y as f64
                    && py <= (pos.y + size.height as i32) as f64
            })
        })
        .or_else(|| app.primary_monitor().ok().flatten());

    if let Some(m) = monitor {
        let work_area = m.work_area();
        let scale = m.scale_factor();
        let scale = if scale <= 0.0 { 1.0 } else { scale };

        let wa_x = work_area.position.x as f64 / scale;
        let wa_y = work_area.position.y as f64 / scale;
        let wa_w = work_area.size.width as f64 / scale;
        let wa_h = work_area.size.height as f64 / scale;

        let (cursor_logical_x, cursor_logical_y) = if cfg!(target_os = "macos") {
            (cursor_x, cursor_y)
        } else {
            (cursor_x / scale, cursor_y / scale)
        };

        let gap = 12.0;
        let max_x = wa_x + wa_w - win_width;
        let max_y = wa_y + wa_h - win_height;
        let preferred_x = cursor_logical_x + gap;
        let preferred_y = cursor_logical_y + gap;
        let flipped_x = cursor_logical_x - win_width - gap;
        let flipped_y = cursor_logical_y - win_height - gap;

        let x = if preferred_x <= max_x {
            preferred_x
        } else {
            flipped_x
        };
        let y = if preferred_y <= max_y {
            preferred_y
        } else {
            flipped_y
        };

        let x = x.clamp(wa_x, max_x.max(wa_x));
        let y = y.clamp(wa_y, max_y.max(wa_y));

        return (x, y);
    }

    (cursor_x, cursor_y)
}
