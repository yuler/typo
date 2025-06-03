use arboard::Clipboard;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

#[tauri::command]
async fn process_text(text: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("Running");
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![process_text])
        .setup(|app| {
            // Menus
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(true)
                .build(app)?;

            // Shortcuts
            // use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

            // let super_i_shortcut = Shortcut::new(Some(Modifiers::ALT), Code::KeyI);
            // println!("Attempting to register shortcut: {:?}", super_i_shortcut);
            // let app_handle = app.handle().clone();
            // println!("Setting up shortcut handler...");
            // app.handle().plugin(
            //     tauri_plugin_global_shortcut::Builder::new().with_handler(move |_app, shortcut, event| {
            //         println!("Shortcut triggered: {:?}, state: {:?}", shortcut, event.state());
            //         if shortcut == &super_i_shortcut && event.state() == ShortcutState::Released {
            //             println!("Alt+I shortcut matched!");
            //             if let Some(window) = app_handle.get_webview_window("main") {
            //                 println!("Found main window, checking visibility...");
            //                 match window.is_visible() {
            //                     Ok(visible) => {
            //                         println!("Window visibility: {}", visible);
            //                         if visible {
            //                             if let Err(e) = window.hide() {
            //                                 println!("Failed to hide window: {:?}", e);
            //                             }
            //                         } else {
            //                             if let Err(e) = window.show() {
            //                                 println!("Failed to show window: {:?}", e);
            //                             }
            //                             if let Err(e) = window.set_focus() {
            //                                 println!("Failed to focus window: {:?}", e);
            //                             }
            //                         }
            //                     }
            //                     Err(e) => println!("Failed to check window visibility: {:?}", e),
            //                 }
            //             } else {
            //                 println!("Could not find main window!");
            //             }
            //         }
            //     })
            //     .build(),
            // )?;

            // println!("Attempting to register Alt+I shortcut...");
            // match app.global_shortcut().register(super_i_shortcut) {
            //     Ok(_) => println!("Successfully registered Alt+I shortcut"),
            //     Err(e) => println!("Failed to register Alt+I shortcut: {:?}", e),
            // }

            Ok(())
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                println!("quit menu item was clicked");
                app.exit(0);
            }
            _ => {
                println!("menu item {:?} not handled", event.id);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
