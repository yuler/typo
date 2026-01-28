use enigo::Keyboard;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_notification::NotificationExt;

#[cfg(target_os = "macos")]
use macos_accessibility_client;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use rdev::{listen, Event, EventType, Key};
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::sync::{Arc, Mutex};
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::Emitter;

mod utils;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn get_selected_text() -> Result<String, String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).unwrap();
    let text = crate::utils::get_selected_text_by_clipboard(&mut enigo, false).map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
async fn get_platform_info() -> Result<String, String> {
    Ok(std::env::consts::OS.to_string())
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

#[tauri::command]
async fn type_text(text: String, window: tauri::Window) -> Result<(), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).unwrap();

    // Through clipboard copy/paste text content avoid no-english input method
    println!("text: {}", text);

    // TODO: diffent mode for user option
    if cfg!(target_os = "macos") {
        enigo.text(&text).map_err(|e| e.to_string())?;
    } else {
        // Use the window's clipboard instead of creating a new app
        window
            .clipboard()
            .write_text(text.clone())
            .map_err(|e| e.to_string())?;

        // Small delay to ensure clipboard is updated
        std::thread::sleep(std::time::Duration::from_millis(200));

        // Ctrl + V to paste text
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
    }

    Ok(())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn setup_global_shortcuts(app: tauri::AppHandle) {
    let app_handle = app.clone();
    
    // 跟踪修饰键状态
    let ctrl_pressed = Arc::new(Mutex::new(false));
    let shift_pressed = Arc::new(Mutex::new(false));
    // 防抖：记录上次触发时间，避免重复触发
    let last_trigger_time = Arc::new(Mutex::new(std::time::Instant::now()));
    
    let ctrl_pressed_clone = ctrl_pressed.clone();
    let shift_pressed_clone = shift_pressed.clone();
    let app_handle_clone = app_handle.clone();
    let last_trigger_time_clone = last_trigger_time.clone();
    
    std::thread::spawn(move || {
        listen(move |event: Event| {
            // output event.event_type to console
            println!("event.event_type: {:?}", event.event_type);
            match event.event_type {
                // 检测 Ctrl/Cmd 键（左右两侧都检测）
                EventType::KeyPress(Key::ControlLeft) 
                | EventType::KeyPress(Key::ControlRight)
                | EventType::KeyPress(Key::MetaLeft)
                | EventType::KeyPress(Key::MetaRight) => {
                    *ctrl_pressed_clone.lock().unwrap() = true;
                }
                EventType::KeyRelease(Key::ControlLeft)
                | EventType::KeyRelease(Key::ControlRight)
                | EventType::KeyRelease(Key::MetaLeft)
                | EventType::KeyRelease(Key::MetaRight) => {
                    *ctrl_pressed_clone.lock().unwrap() = false;
                }
                // 检测 Shift 键（左右两侧都检测）
                EventType::KeyPress(Key::ShiftLeft) | EventType::KeyPress(Key::ShiftRight) => {
                    *shift_pressed_clone.lock().unwrap() = true;
                }
                EventType::KeyRelease(Key::ShiftLeft) | EventType::KeyRelease(Key::ShiftRight) => {
                    *shift_pressed_clone.lock().unwrap() = false;
                }
                // 检测 Ctrl/Cmd + Shift + X (DEFAULT_SHORTCUT)
                EventType::KeyPress(Key::KeyX) => {
                    let ctrl = *ctrl_pressed_clone.lock().unwrap();
                    let shift = *shift_pressed_clone.lock().unwrap();
                    if ctrl && shift {
                        let mut last_time = last_trigger_time_clone.lock().unwrap();
                        // 防抖：至少间隔 200ms
                        if last_time.elapsed().as_millis() > 200 {
                            *last_time = std::time::Instant::now();
                            let _ = app_handle_clone.emit("global-shortcut", "default");
                        }
                    }
                }
                // 检测 Ctrl/Cmd + , (SETTING_SHORTCUT)
                EventType::KeyPress(Key::Comma) => {
                    let ctrl = *ctrl_pressed_clone.lock().unwrap();
                    if ctrl {
                        let mut last_time = last_trigger_time_clone.lock().unwrap();
                        // 防抖：至少间隔 200ms
                        if last_time.elapsed().as_millis() > 200 {
                            *last_time = std::time::Instant::now();
                            let _ = app_handle_clone.emit("global-shortcut", "settings");
                        }
                    }
                }
                _ => {}
            }
        })
        .expect("Failed to listen to global keyboard events");
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
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
        .setup(|app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                setup_global_shortcuts(app.handle().clone());
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_selected_text,
            type_text,
            get_platform_info,
            request_mac_accessibility_permissions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
