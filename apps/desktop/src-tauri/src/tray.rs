use serde::Deserialize;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Wry};
use tauri_plugin_opener::OpenerExt;

pub const TRAY_ID: &str = "main";

const RELEASES_URL_BASE: &str = "https://typo.yuler.cc/releases/#v";

// Menu-item IDs. Keep in sync with the on_menu_event match arms below.
const ID_SHOW: &str = "show";
const ID_SETTINGS: &str = "settings";
const ID_CHECK_UPDATES: &str = "check-updates";
const ID_ABOUT: &str = "about";
const ID_OPEN_LOG_FOLDER: &str = "open-log-folder";
const ID_QUIT: &str = "quit";

// Events emitted to the frontend.
const EV_OPEN_SETTINGS: &str = "tray:open-settings";
const EV_CHECK_UPDATES: &str = "tray:check-updates";
const EV_TOGGLE_CLICKED: &str = "tray:toggle-clicked";

/// Handles to mutable menu items so update_tray_menu can relabel them.
pub struct TrayMenuHandles {
    pub show: MenuItem<Wry>,
    pub settings: MenuItem<Wry>,
    pub check_updates: MenuItem<Wry>,
    pub about: MenuItem<Wry>,
    pub open_log_folder: MenuItem<Wry>,
    pub quit: MenuItem<Wry>,
}

#[derive(Deserialize)]
pub struct TrayLabels {
    pub show: Option<String>,
    pub settings: Option<String>,
    pub check_updates: Option<String>,
    pub about: Option<String>,
    pub open_log_folder: Option<String>,
    pub quit: Option<String>,
    pub tooltip: Option<String>,
}

pub fn init(app: &tauri::App) -> tauri::Result<()> {
    let handle = app.handle();

    let show = MenuItem::with_id(handle, ID_SHOW, "Show typo", true, None::<&str>)?;
    let settings = MenuItem::with_id(handle, ID_SETTINGS, "Settings…", true, None::<&str>)?;
    let check_updates = MenuItem::with_id(
        handle,
        ID_CHECK_UPDATES,
        "Check for updates…",
        true,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(handle)?;
    let about = MenuItem::with_id(
        handle,
        ID_ABOUT,
        format!("About typo v{}", env!("CARGO_PKG_VERSION")),
        true,
        None::<&str>,
    )?;
    let open_log_folder = MenuItem::with_id(
        handle,
        ID_OPEN_LOG_FOLDER,
        "Open log folder…",
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(handle, ID_QUIT, "Quit typo", true, Some("CmdOrCtrl+Q"))?;

    let menu = Menu::with_items(
        handle,
        &[&show, &settings, &check_updates, &separator, &about, &open_log_folder, &quit],
    )?;

    let icon_bytes = include_bytes!("../icons/tray.png");
    let icon = tauri::image::Image::from_bytes(icon_bytes)?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .icon_as_template(true)
        .tooltip("typo")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| handle_tray_icon_event(tray.app_handle(), event))
        .on_menu_event(|app, event| handle_menu_event(app, event.id().as_ref()))
        .build(handle)?;

    handle.manage(TrayMenuHandles {
        show,
        settings,
        check_updates,
        about,
        open_log_folder,
        quit,
    });

    Ok(())
}

fn handle_tray_icon_event(app: &AppHandle, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        if let Err(err) = app.emit(EV_TOGGLE_CLICKED, ()) {
            log::error!("failed to emit {}: {}", EV_TOGGLE_CLICKED, err);
        }
        show_and_focus_main(app);
    }
}

fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        ID_SHOW => show_and_focus_main(app),
        ID_SETTINGS => {
            show_and_focus_main(app);
            if let Err(err) = app.emit(EV_OPEN_SETTINGS, ()) {
                log::error!("failed to emit {}: {}", EV_OPEN_SETTINGS, err);
            }
        }
        ID_CHECK_UPDATES => {
            if let Err(err) = app.emit(EV_CHECK_UPDATES, ()) {
                log::error!("failed to emit {}: {}", EV_CHECK_UPDATES, err);
            }
        }
        ID_ABOUT => {
            let releases_url = format!("{}{}", RELEASES_URL_BASE, env!("CARGO_PKG_VERSION"));
            if let Err(err) = app.opener().open_url(&releases_url, None::<&str>) {
                log::error!("failed to open {}: {}", releases_url, err);
            }
        }
        ID_OPEN_LOG_FOLDER => open_log_folder_action(app),
        ID_QUIT => app.exit(0),
        other => log::error!("unknown tray menu event id: {}", other),
    }
}

fn open_log_folder_action(app: &AppHandle) {
    use tauri::Manager;
    match app.path().app_log_dir() {
        Ok(dir) => {
            if let Err(err) = app.opener().open_path(dir.to_string_lossy(), None::<&str>) {
                log::error!("failed to open log folder: {}", err);
            }
        }
        Err(err) => {
            log::error!("failed to resolve app log dir: {}", err);
        }
    }
}

fn show_and_focus_main(app: &AppHandle) {
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

#[tauri::command]
pub fn update_tray_menu(
    app: AppHandle,
    labels: TrayLabels,
) -> Result<(), String> {
    let Some(state) = app.try_state::<TrayMenuHandles>() else {
        log::error!("tray menu handles not found in state, tray might not be initialized");
        return Ok(());
    };
    if let Some(text) = labels.show.as_deref() {
        state.show.set_text(text).map_err(|e| e.to_string())?;
    }
    if let Some(text) = labels.settings.as_deref() {
        state.settings.set_text(text).map_err(|e| e.to_string())?;
    }
    if let Some(text) = labels.check_updates.as_deref() {
        state
            .check_updates
            .set_text(text)
            .map_err(|e| e.to_string())?;
    }
    if let Some(text) = labels.about.as_deref() {
        state.about.set_text(text).map_err(|e| e.to_string())?;
    }
    if let Some(text) = labels.open_log_folder.as_deref() {
        state
            .open_log_folder
            .set_text(text)
            .map_err(|e| e.to_string())?;
    }
    if let Some(text) = labels.quit.as_deref() {
        state.quit.set_text(text).map_err(|e| e.to_string())?;
    }
    if let Some(tooltip) = labels.tooltip.as_deref() {
        if let Some(tray) = app.tray_by_id(TRAY_ID) {
            tray.set_tooltip(Some(tooltip)).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
