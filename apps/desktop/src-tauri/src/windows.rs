// apps/desktop/src-tauri/src/windows.rs
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

#[cfg(target_os = "macos")]
use tauri::{LogicalPosition, TitleBarStyle};


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

pub fn show_and_focus_main_settings(app: &AppHandle) {
    if app.get_webview_window("main").is_none() {
        crate::set_pending_open_settings(true);
    }
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
        let _ = window.set_focus();
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
            let _ = window.show();
            let _ = window.set_always_on_top(true);
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
        let _ = window.set_focus();
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
