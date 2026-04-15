//! Clipboard helpers via [CopyQ](https://hluk.github.io/CopyQ/).

use std::process::{Command, Stdio};

/// `copyq selection`
pub fn copyq_selection() -> Option<String> {
    ensure_copyq_server_start();
    let output = Command::new("copyq")
        .args(["selection", "text/plain"])
        .stderr(Stdio::null())
        .output()
        .ok()?;

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).to_string();
        if !text.is_empty() {
            return Some(text);
        }
    }
    None
}

/// `copyq --start-server`
pub fn ensure_copyq_server_start() -> bool {
    Command::new("copyq")
        .arg("--start-server")
        .stderr(Stdio::null())
        .stdout(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

/// `copyq paste`
pub fn copyq_paste() -> bool {
    let output = Command::new("copyq")
        .arg("paste")
        .stderr(Stdio::piped())
        .output();
    match output {
        Ok(output) => output.status.success(),
        Err(_) => false,
    }
}

/// `ydotool key CTRL+c` to trigger copy shortcut on Wayland.
pub fn ydotool_copy_shortcut() -> bool {
    let ctrl_c = Command::new("ydotool")
        .args(["key", "CTRL+c"])
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .output();

    let Ok(ctrl_c_output) = ctrl_c else {
        return false;
    };

    ctrl_c_output.status.success()
}

/// `ydotool key ...` to trigger paste shortcuts on Wayland.
pub fn ydotool_paste_shortcut() -> bool {
    let ctrl_v = Command::new("ydotool")
        .args(["key", "CTRL+v"])
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .output();

    let Ok(ctrl_v_output) = ctrl_v else {
        return false;
    };

    ctrl_v_output.status.success()
}
