use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{
    menu::{Menu, MenuItem},
    Runtime,
};

pub static TRAY_EVENT_REGISTERED: AtomicBool = AtomicBool::new(false);

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let check_for_updates_i = MenuItem::with_id(app, "check_for_updates", "Check for Updates", true, None::<&str>)?;

    let settings_i = MenuItem::with_id(app, "settings", "Settings", true, Some("CmdOrCtrl+,"))?;
    // cmd + c & cmd + t
    let show_i = MenuItem::with_id(app, "show", "Show", true, Some("CmdOrCtrl+C"))?;
    // let hide_i = PredefinedMenuItem::hide(app, Some("Hide"))?;

    let menu = Menu::with_items(app, &[&check_for_updates_i, &settings_i, &show_i])?;

    let tray = app.tray_by_id("tray").unwrap();
    tray.set_menu(Some(menu.clone()))?;
    if TRAY_EVENT_REGISTERED.load(Ordering::Acquire) {
        return Ok(());
    }
    TRAY_EVENT_REGISTERED.store(true, Ordering::Release);
    tray.on_menu_event(move |_app, event| match event.id.as_ref() {
        "check_for_updates" => {
            println!("Check for Updates");
        }
        "settings" => {
            println!("Settings");
        }
        "show" => {
            println!("Show");
        }
        _ => {} // ignore other events
    });
    
    tray.set_show_menu_on_left_click(false)?;


    Ok(())
}
