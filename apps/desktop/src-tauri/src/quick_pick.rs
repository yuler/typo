use crate::{
    get_selected_text_enigo, get_selected_text_wayland, in_linux_wayland, SetInputPayload,
};
use crate::windows;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use tauri::{Emitter, Manager};
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
            windows::create_quick_pick_window(&app_clone);
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

            windows::create_quick_pick_window(&app);

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
