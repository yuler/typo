#[cfg(target_os = "macos")]
use std::process::Command;
#[cfg(target_os = "macos")]
use std::path::{Path, PathBuf};
use tauri::Emitter;
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub fn cleanup_legacy_macos_login_item(_app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let app_name = escape_applescript_string(&_app.package_info().name);
        let script = format!(
            r#"
tell application "System Events"
    if exists login item "{0}" then
        delete login item "{0}"
    end if
end tell
"#,
            app_name
        );

        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|error| format!("failed to run osascript: {}", error))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("failed to remove login item: {}", stderr.trim()));
        }

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(())
    }
}

#[tauri::command]
pub fn is_legacy_macos_login_item_enabled(_app: tauri::AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        let app_name = escape_applescript_string(&_app.package_info().name);
        let script = format!(
            r#"
tell application "System Events"
    return exists login item "{0}"
end tell
"#,
            app_name
        );

        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|error| format!("failed to run osascript: {}", error))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("failed to check login item: {}", stderr.trim()));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.trim() == "true")
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}

#[cfg(target_os = "macos")]
fn escape_applescript_string(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

#[cfg(target_os = "macos")]
fn app_bundle_path(executable_path: &Path) -> PathBuf {
    executable_path
        .ancestors()
        .find(|ancestor| {
            ancestor
                .file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.ends_with(".app"))
        })
        .map(Path::to_path_buf)
        .unwrap_or_else(|| executable_path.to_path_buf())
}

#[tauri::command]
pub fn ensure_legacy_macos_login_item(_app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let app_name = escape_applescript_string(&_app.package_info().name);
        let executable_path = std::env::current_exe()
            .map_err(|error| format!("failed to resolve executable path: {}", error))?;
        let login_path = app_bundle_path(&executable_path);
        let escaped_path = escape_applescript_string(&login_path.to_string_lossy());

        let script = format!(
            r#"
tell application "System Events"
    if not (exists login item "{0}") then
        make login item at end with properties {{name:"{0}", path:"{1}", hidden:true}}
    end if
end tell
"#,
            app_name, escaped_path
        );

        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|error| format!("failed to run osascript: {}", error))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("failed to create login item: {}", stderr.trim()));
        }

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(())
    }
}

#[tauri::command]
pub fn is_autostart_enabled(app: tauri::AppHandle) -> Result<bool, String> {
    let plugin_enabled = app.autolaunch().is_enabled().unwrap_or_else(|e| {
        log::warn!("failed to check autostart plugin status: {}", e);
        false
    });
    #[cfg(target_os = "macos")]
    let legacy_enabled = is_legacy_macos_login_item_enabled(app.clone())?;
    #[cfg(not(target_os = "macos"))]
    let legacy_enabled = false;

    Ok(plugin_enabled || legacy_enabled)
}

#[tauri::command]
pub fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    if enabled {
        let mut plugin_success = true;
        if let Err(e) = manager.enable() {
            log::warn!("failed to enable autostart plugin: {}", e);
            plugin_success = false;
        }

        #[cfg(target_os = "macos")]
        {
            if !plugin_success || !manager.is_enabled().unwrap_or(false) {
                log::info!("falling back to legacy macos login item");
                if let Err(e) = ensure_legacy_macos_login_item(app.clone()) {
                    log::error!("failed to enable legacy macos login item: {}", e);
                    return Err(format!("Failed to enable autostart (plugin and fallback failed): {}", e));
                }
            } else {
                if let Err(e) = cleanup_legacy_macos_login_item(app.clone()) {
                    log::warn!("failed to cleanup legacy login item during autostart enable: {}", e);
                }
            }
        }

        if !plugin_success {
            #[cfg(not(target_os = "macos"))]
            {
                return Err("Failed to enable autostart".to_string());
            }
        }
    } else {
        if let Err(e) = manager.disable() {
            log::warn!("failed to disable autostart plugin: {}", e);
        }
        #[cfg(target_os = "macos")]
        if let Err(e) = cleanup_legacy_macos_login_item(app.clone()) {
            log::warn!("failed to cleanup legacy login item during autostart disable: {}", e);
        }
    }

    let _ = app.emit("autostart-changed", enabled);

    Ok(())
}
