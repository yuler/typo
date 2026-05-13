// apps/desktop/src-tauri/src/windows.rs
use tauri::{AppHandle, WebviewWindowBuilder, WebviewUrl, Manager};

#[tauri::command]
pub fn open_settings_window(app: AppHandle) {
    create_settings_window(&app);
}

#[tauri::command]
pub fn open_upgrade_window(app: AppHandle) {
    create_upgrade_window(&app);
}

#[tauri::command]
pub fn open_indicator_window(app: AppHandle) {
    create_indicator_window(&app);
}

pub fn create_home_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("home") {
        let _ = window.set_focus();
        return;
    }

    let win_width = 1000.0;
    let win_height = 800.0;

    let win_builder = WebviewWindowBuilder::new(app, "home", WebviewUrl::App("index.html".into()))
        .title("Typeless")
        .inner_size(win_width, win_height)
        .center()
        .decorations(true)
        .transparent(false)
        .always_on_top(false)
        .skip_taskbar(false)
        .visible(true);

    let _ = win_builder.build();
}

pub fn create_indicator_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("indicator") {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    // 获取主显示器信息
    let monitor = app.primary_monitor().ok().flatten();
    let (width, height) = if let Some(m) = monitor {
        let size = m.size();
        (size.width as f64, size.height as f64)
    } else {
        (1920.0, 1080.0)
    };

    let win_width = 360.0;
    let win_height = 56.0;
    let x = (width - win_width) / 2.0;
    let y = height - win_height - 20.0; // 距离底部 20px

    let _ = WebviewWindowBuilder::new(app, "indicator", WebviewUrl::App("index.html".into()))
        .title("typo - Indicator")
        .inner_size(win_width, win_height)
        .position(x, y)
        .decorations(false)
        .transparent(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible_on_all_workspaces(true)
        .visible(false)
        .build();
}

pub fn create_settings_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.set_focus();
        return;
    }

    let _ = WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html".into()))
        .title("typo - Settings")
        .inner_size(800.0, 600.0)
        .build();
}

pub fn create_upgrade_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("upgrade") {
        let _ = window.set_focus();
        return;
    }

    let _ = WebviewWindowBuilder::new(app, "upgrade", WebviewUrl::App("index.html".into()))
        .title("typo - Upgrade")
        .inner_size(400.0, 300.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .build();
}
