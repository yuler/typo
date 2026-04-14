use enigo::Keyboard;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_notification::NotificationExt;

#[cfg(target_os = "macos")]
use macos_accessibility_client;

#[cfg(target_os = "linux")]
mod session_linux;

#[cfg(target_os = "linux")]
mod linux_global_shortcuts;

mod accelerator_xdg;
mod shortcut_status;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn get_selected_text() -> Result<String, String> {
    let text = get_selected_text::get_selected_text().map_err(|e| e.to_string())?;
    Ok(text)
}

fn select_all_sync() -> Result<(), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).map_err(|e| e.to_string())?;
    let modifier = if cfg!(target_os = "macos") {
        enigo::Key::Meta
    } else {
        enigo::Key::Control
    };
    enigo.key(modifier, enigo::Direction::Press).map_err(|e| e.to_string())?;
    enigo.key(enigo::Key::Unicode('a'), enigo::Direction::Click).map_err(|e| e.to_string())?;
    enigo.key(modifier, enigo::Direction::Release).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn select_all(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(), String>>(1);
        app
            .run_on_main_thread(move || {
                let _ = tx.send(select_all_sync());
            })
            .map_err(|e| e.to_string())?;
        tauri::async_runtime::spawn_blocking(move || match rx.recv() {
            Ok(r) => r,
            Err(_) => Err("select_all was cancelled".to_string()),
        })
        .await
        .map_err(|e| e.to_string())?
    }
    #[cfg(not(target_os = "macos"))]
    {
        select_all_sync()
    }
}

#[tauri::command]
async fn get_platform_info() -> Result<String, String> {
    Ok(std::env::consts::OS.to_string())
}

#[tauri::command]
fn get_shortcut_registration_status() -> shortcut_status::ShortcutRegistrationStatus {
    shortcut_status::get_shortcut_registration_status()
}

#[tauri::command]
fn request_mac_accessibility_permissions() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        let trusted =
            macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
        if trusted {
            print!("Application is totally trusted!");
        } else {
            print!("Application isn't trusted :(");
        }
        Ok(trusted)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(true)
    }
}

fn type_text_sync(text: String, window: tauri::Window) -> Result<(), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).map_err(|e| e.to_string())?;

    // log text
    println!("Typing text: {}", text);

    // 1. Save current clipboard content to restore later
    let previous_clipboard = window.clipboard().read_text().unwrap_or_default();

    // 2. Write the new text to the clipboard
    window
        .clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    // Small delay to ensure clipboard is updated
    std::thread::sleep(std::time::Duration::from_millis(50));

    // 3. Ctrl/Cmd + V to paste text
    let control_or_command = if cfg!(target_os = "macos") {
        enigo::Key::Meta
    } else {
        enigo::Key::Control
    };
    enigo
        .key(control_or_command, enigo::Direction::Press)
        .map_err(|e| e.to_string())?;
    enigo
        .key(enigo::Key::Unicode('v'), enigo::Direction::Click)
        .map_err(|e| e.to_string())?;
    enigo
        .key(control_or_command, enigo::Direction::Release)
        .map_err(|e| e.to_string())?;

    // 4. Small delay to ensure paste is completed before restoring clipboard
    std::thread::sleep(std::time::Duration::from_millis(50));

    // 5. Restore previous clipboard
    if !previous_clipboard.is_empty() {
        let _ = window.clipboard().write_text(previous_clipboard);
    }

    Ok(())
}

#[tauri::command]
async fn type_text(text: String, window: tauri::Window) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(), String>>(1);
        let window_for_task = window.clone();
        window
            .run_on_main_thread(move || {
                let _ = tx.send(type_text_sync(text, window_for_task));
            })
            .map_err(|e| e.to_string())?;
        tauri::async_runtime::spawn_blocking(move || match rx.recv() {
            Ok(r) => r,
            Err(_) => Err("type_text was cancelled".to_string()),
        })
        .await
        .map_err(|e| e.to_string())?
    }
    #[cfg(not(target_os = "macos"))]
    {
        type_text_sync(text, window)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "linux")]
            {
                use session_linux::SessionKind;
                use shortcut_status::{
                    set_shortcut_registration_status, ShortcutRegistrationBackend,
                    ShortcutRegistrationStatus,
                };
                if session_linux::session_kind_from_env() == SessionKind::Wayland {
                    let handle = app.handle().clone();
                    std::thread::spawn(move || {
                        if let Err(e) = tauri::async_runtime::block_on(
                            linux_global_shortcuts::try_register_portal(handle),
                        ) {
                            set_shortcut_registration_status(ShortcutRegistrationStatus {
                                backend: ShortcutRegistrationBackend::None,
                                plugin_fallback_attempted: false,
                                error_message: Some(e),
                            });
                        }
                    });
                }
            }
            Ok(())
        })
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);
            app.notification()
                .builder()
                .title("This app is already running!")
                .body("You can find it in the tray menu.")
                .show()
                .unwrap();
        }))
        .invoke_handler(tauri::generate_handler![
            get_selected_text,
            select_all,
            type_text,
            get_platform_info,
            get_shortcut_registration_status,
            request_mac_accessibility_permissions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
