// apps/desktop/src-tauri/src/windows.rs
use tauri::{
    AppHandle, Emitter, LogicalPosition, Manager, Position, WebviewUrl, WebviewWindowBuilder,
    WindowEvent,
};
use std::sync::atomic::{AtomicBool, Ordering};
use enigo::{Enigo, Mouse};

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;

static PENDING_OPEN_SETTINGS: AtomicBool = AtomicBool::new(false);

pub fn set_pending_open_settings(value: bool) {
    PENDING_OPEN_SETTINGS.store(value, Ordering::Relaxed);
}

#[tauri::command]
pub fn consume_pending_open_settings() -> bool {
    PENDING_OPEN_SETTINGS.swap(false, Ordering::Relaxed)
}

#[tauri::command]
pub fn get_cursor_position() -> (i32, i32) {
    match Enigo::new(&enigo::Settings::default()) {
        Ok(enigo) => enigo.location().unwrap_or((0, 0)),
        Err(err) => {
            log::error!("failed to initialize enigo: {}", err);
            (0, 0)
        }
    }
}

#[tauri::command]
pub fn open_upgrade_window(app: AppHandle) {
    create_upgrade_window(&app);
}

#[tauri::command]
pub fn open_indicator_window(app: AppHandle) {
    create_indicator_window(&app, true);
}

#[tauri::command]
pub fn open_main_window(app: AppHandle) {
    show_and_focus_main_settings(&app);
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

pub fn show_and_focus_main_settings(app: &AppHandle) {
    set_pending_open_settings(true);
    show_and_focus_main(app);
    if let Err(err) = app.emit("open-settings", ()) {
        log::error!("failed to emit open-settings: {}", err);
    }
}

pub fn show_and_focus_main(app: &AppHandle) {
    create_main_window(app);
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    if let Err(err) = window.show() {
        log::error!("failed to show main window: {}", err);
    }
    if let Err(err) = window.set_focus() {
        log::error!("failed to focus main window: {}", err);
    }
}

pub fn create_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(err) = window.set_focus() {
            log::error!("failed to focus main window: {}", err);
        }
        return;
    }

    let win_width = 1200.0;
    let win_height = 800.0;
    let win_min_width = 960.0;
    let win_min_height = 800.0;

    let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .inner_size(win_width, win_height)
        .min_inner_size(win_min_width, win_min_height)
        .center()
        .decorations(true);

    #[cfg(target_os = "macos")]
    let win_builder = win_builder
        .title_bar_style(TitleBarStyle::Overlay)
        .traffic_light_position(LogicalPosition::new(16.0, 13.0))
        .hidden_title(true);

    let win_builder = win_builder
        .transparent(false)
        .title("Typo")
        .always_on_top(false)
        .skip_taskbar(false)
        .visible(true);

    let window = match win_builder.build() {
        Ok(window) => window,
        Err(e) => {
            log::error!("failed to build main window: {}", e);
            return;
        }
    };

    let window_for_close = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            if let Err(err) = window_for_close.hide() {
                log::error!("failed to hide main window: {}", err);
            }
        }
    });
}

pub fn create_indicator_window(app: &AppHandle, show: bool) {
    if let Some(window) = app.get_webview_window("indicator") {
        if show {
            if let Err(err) = window.show() {
                log::error!("failed to show indicator window: {}", err);
            }
            if let Err(err) = window.set_always_on_top(true) {
                log::error!("failed to set always on top for indicator window: {}", err);
            }
        }
        return;
    }

    // Get primary monitor work area information (excluding Dock and menu bar)
    let monitor = app.primary_monitor().ok().flatten();
    let (width, height, _scale) = if let Some(m) = monitor {
        let area = m.work_area();
        let scale = m.scale_factor();
        (area.size.width as f64 / scale, area.size.height as f64 / scale, scale)
    } else {
        (1920.0, 1080.0, 1.0)
    };

    let win_width = 360.0;
    let win_height = 60.0;
    let x = (width - win_width) / 2.0;
    let y = height - win_height - 20.0; // 20px above the bottom of the work area

    if let Err(e) = WebviewWindowBuilder::new(app, "indicator", WebviewUrl::App("index.html".into()))
        .title("typo - Indicator")
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
        log::error!("failed to build indicator window: {}", e);
    }
}


pub fn create_upgrade_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("upgrade") {
        if let Err(err) = window.set_focus() {
            log::error!("failed to focus upgrade window: {}", err);
        }
        return;
    }

    if let Err(e) = WebviewWindowBuilder::new(app, "upgrade", WebviewUrl::App("index.html".into()))
        .title("typo - Upgrade")
        .inner_size(480.0, 420.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .center()
        .build()
    {
        log::error!("failed to build upgrade window: {}", e);
    }
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

    // Get the monitor that contains the cursor, or the primary monitor as fallback
    let monitor = app.available_monitors().ok().and_then(|monitors: Vec<tauri::Monitor>| {
        monitors.into_iter().find(|m: &tauri::Monitor| {
            let pos = m.position();
            let size = m.size();
            let scale = m.scale_factor();
            
            // Physical coordinates for comparison
            let (px, py) = if cfg!(target_os = "macos") {
                (cursor_x * scale, cursor_y * scale)
            } else {
                (cursor_x, cursor_y)
            };
            
            px >= pos.x as f64 && px <= (pos.x + size.width as i32) as f64 &&
            py >= pos.y as f64 && py <= (pos.y + size.height as i32) as f64
        })
    }).or_else(|| app.primary_monitor().ok().flatten());

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
