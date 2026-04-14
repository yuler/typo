#![cfg(target_os = "linux")]

use ashpd::desktop::global_shortcuts::{BindShortcutsOptions, GlobalShortcuts, NewShortcut};
use ashpd::desktop::CreateSessionOptions;
use ashpd::WindowIdentifier;
use futures_util::StreamExt;
use raw_window_handle::{
    HandleError, HasDisplayHandle, HasWindowHandle, RawDisplayHandle, RawWindowHandle,
};
use std::time::Duration;
use tauri::{Emitter, Manager};

use crate::accelerator_xdg::typo_default_accelerators_to_xdg;
use crate::shortcut_status::{
    set_shortcut_registration_status, ShortcutRegistrationBackend, ShortcutRegistrationStatus,
};

const HANDLE_RETRY_DELAY_MS: u64 = 80;
const HANDLE_RETRY_MAX: u32 = 50;

/// `raw-window-handle` returns [`HandleError::Unavailable`] until the webview has a real surface
/// (e.g. after the window is shown on Wayland).
async fn try_capture_wayland_surface_ptrs(window: &tauri::WebviewWindow) -> Result<(usize, usize), String> {
    for attempt in 0..HANDLE_RETRY_MAX {
        let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(usize, usize), String>>(1);
        let win = window.clone();
        window
            .run_on_main_thread(move || {
                let res = (|| -> Result<(usize, usize), String> {
                    let wh = match win.window_handle() {
                        Ok(h) => h.as_raw(),
                        Err(HandleError::Unavailable) => {
                            return Err("__UNAVAILABLE__".to_string());
                        }
                        Err(e) => return Err(e.to_string()),
                    };
                    let dh = match win.display_handle() {
                        Ok(h) => h.as_raw(),
                        Err(HandleError::Unavailable) => {
                            return Err("__UNAVAILABLE__".to_string());
                        }
                        Err(e) => return Err(e.to_string()),
                    };
                    match (wh, dh) {
                        (
                            RawWindowHandle::Wayland(w),
                            RawDisplayHandle::Wayland(d),
                        ) => Ok((w.surface.as_ptr() as usize, d.display.as_ptr() as usize)),
                        _ => Err(
                            "expected Wayland raw window and display handles".to_string(),
                        ),
                    }
                })();
                let _ = tx.send(res);
            })
            .map_err(|e| e.to_string())?;

        let recv_result = tauri::async_runtime::spawn_blocking(move || {
            rx.recv()
                .map_err(|_| "window handle channel closed".to_string())?
        })
        .await
        .map_err(|e| e.to_string())?;

        match recv_result {
            Ok(pair) => return Ok(pair),
            Err(msg) if msg == "__UNAVAILABLE__" => {
                if attempt + 1 == HANDLE_RETRY_MAX {
                    return Err(
                        "the underlying handle is not available (window surface not ready)"
                            .to_string(),
                    );
                }
                std::thread::sleep(Duration::from_millis(HANDLE_RETRY_DELAY_MS));
            }
            Err(e) => return Err(e),
        }
    }

    Err("timed out waiting for Wayland window surface".to_string())
}

pub async fn try_register_portal(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "missing main webview window".to_string())?;

    let (surface_ptr, display_ptr) = try_capture_wayland_surface_ptrs(&window).await?;

    let identifier = unsafe {
        WindowIdentifier::from_wayland_raw(
            surface_ptr as *mut std::ffi::c_void,
            display_ptr as *mut std::ffi::c_void,
        )
        .await
    }
    .ok_or_else(|| "WindowIdentifier::from_wayland_raw returned None".to_string())?;

    let gs = GlobalShortcuts::new()
        .await
        .map_err(|e| format!("GlobalShortcuts::new: {e}"))?;

    let session = gs
        .create_session(CreateSessionOptions::default())
        .await
        .map_err(|e| format!("create_session: {e}"))?;

    let shortcuts: Vec<NewShortcut> = typo_default_accelerators_to_xdg()
        .into_iter()
        .map(|(id, desc, trigger)| {
            NewShortcut::new(id, desc).preferred_trigger(Some(trigger))
        })
        .collect();

    let bind_request = gs
        .bind_shortcuts(
            &session,
            &shortcuts,
            Some(&identifier),
            BindShortcutsOptions::default(),
        )
        .await
        .map_err(|e| format!("bind_shortcuts: {e}"))?;

    let _bound = bind_request
        .response()
        .map_err(|e| format!("bind_shortcuts response: {e}"))?;

    set_shortcut_registration_status(ShortcutRegistrationStatus {
        backend: ShortcutRegistrationBackend::Portal,
        plugin_fallback_attempted: false,
        error_message: None,
    });

    let app_for_task = app.clone();
    tauri::async_runtime::spawn(async move {
        let _session = session;
        let mut stream = match gs.receive_activated().await {
            Ok(s) => s,
            Err(e) => {
                eprintln!("receive_activated: {e}");
                return;
            }
        };
        while let Some(ev) = stream.next().await {
            let id = ev.shortcut_id();
            let payload = if id == "typo.open_main" {
                "main"
            } else if id == "typo.open_settings" {
                "settings"
            } else {
                continue;
            };
            let _ = app_for_task.emit("typo-global-shortcut", payload);
        }
    });

    Ok(())
}

#[cfg(all(test, target_os = "linux"))]
mod portal_smoke {
    #[tokio::test]
    // #[ignore = "requires a running Wayland desktop session with xdg-desktop-portal"]
    async fn global_shortcuts_new_succeeds_on_wayland_desktop() {
        let gs = ashpd::desktop::global_shortcuts::GlobalShortcuts::new().await;
        assert!(gs.is_ok(), "{:?}", gs.err());
    }
}
