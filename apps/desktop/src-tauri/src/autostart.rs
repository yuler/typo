#[cfg(target_os = "macos")]
use std::process::Command;
#[cfg(target_os = "macos")]
use std::path::{Path, PathBuf};

#[cfg(target_os = "macos")]
const APP_NAME: &str = "typo";

#[tauri::command]
pub fn cleanup_legacy_macos_login_item() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            r#"
tell application "System Events"
    if exists login item "{0}" then
        delete login item "{0}"
    end if
end tell
"#,
            APP_NAME
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
pub fn ensure_legacy_macos_login_item() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
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
            APP_NAME, escaped_path
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
