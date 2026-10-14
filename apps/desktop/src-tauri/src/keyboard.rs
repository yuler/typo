use enigo::Keyboard;
use tauri_plugin_clipboard_manager::ClipboardExt;

use std::process::{Command, Stdio};

/// Create a new Enigo instance, release all modifier keys, and return the
/// platform modifier (`Meta` on macOS, `Control` elsewhere).
fn new_enigo() -> Result<(enigo::Enigo, enigo::Key), String> {
    let mut enigo = enigo::Enigo::new(&enigo::Settings::default()).map_err(|e| e.to_string())?;
    let modifier = if cfg!(target_os = "macos") {
        enigo::Key::Meta
    } else {
        enigo::Key::Control
    };

    let _ = enigo.key(enigo::Key::Control, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Alt, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Shift, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Space, enigo::Direction::Release);
    let _ = enigo.key(enigo::Key::Tab, enigo::Direction::Release);

    Ok((enigo, modifier))
}

fn enigo_copy_raw() -> Result<(), String> {
    let (mut enigo, modifier) = new_enigo()?;

    let _ = enigo.key(modifier, enigo::Direction::Press);
    let _ = enigo.key(enigo::Key::Unicode('c'), enigo::Direction::Click);
    let _ = enigo.key(modifier, enigo::Direction::Release);

    Ok(())
}

/// Sends `Ctrl + c` (Linux/Windows) or `Cmd + c` (macOS) to copy the current selection.
pub(crate) fn enigo_copy(app: &tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn pthread_main_np() -> std::os::raw::c_int;
        }
        let is_main_thread = unsafe { pthread_main_np() == 1 };

        if is_main_thread {
            enigo_copy_raw()
        } else {
            let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(), String>>(1);
            app.run_on_main_thread(move || {
                let _ = tx.send(enigo_copy_raw());
            })
            .map_err(|e| e.to_string())?;

            rx.recv().unwrap_or_else(|_| Err("Copy failed".into()))
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        enigo_copy_raw()
    }
}

/// Sends `Ctrl + v` (Linux/Windows) or `Cmd + v` (macOS) to paste from the clipboard.
pub(crate) fn enigo_paste() -> Result<(), String> {
    let (mut enigo, modifier) = new_enigo()?;

    let _ = enigo.key(modifier, enigo::Direction::Press);
    let _ = enigo.key(enigo::Key::Unicode('v'), enigo::Direction::Click);
    let _ = enigo.key(modifier, enigo::Direction::Release);

    Ok(())
}

/// Sends `Ctrl + a` (Linux/Windows) or `Cmd + a` (macOS) to select all.
pub fn enigo_select_all() -> Result<(), String> {
    let (mut enigo, modifier) = new_enigo()?;

    let _ = enigo.key(modifier, enigo::Direction::Press);
    let _ = enigo.key(enigo::Key::Unicode('a'), enigo::Direction::Click);
    let _ = enigo.key(modifier, enigo::Direction::Release);

    Ok(())
}

pub fn _enigo_paste_text(text: String, window: tauri::Window) -> Result<(), String> {
    if crate::in_linux_wayland() {
        return keyboard_paste_text_wayland(text, window);
    }

    let previous_clipboard = window.clipboard().read_text().unwrap_or_default();

    window
        .clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(50));

    enigo_paste().map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(50));

    if !previous_clipboard.is_empty() {
        let _ = window.clipboard().write_text(previous_clipboard);
    }

    Ok(())
}

fn wl_paste_args(args: &[&str]) -> Option<String> {
    // `wl-paste` waits forever when nobody owns that selection.
    let output = Command::new("timeout")
        .arg("--signal=KILL")
        .arg("0.2")
        .arg("wl-paste")
        .args(args)
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

/// Regular Wayland clipboard. Separate process so we never read a value this
/// app just wrote through arboard (that deadlocks on Linux).
pub fn wl_paste_clipboard() -> Option<String> {
    // `--type text` skips the non-text offer WeChat sometimes puts on the
    // clipboard (a binary blob that still is not the sentinel).
    wl_paste_args(&["--no-newline", "--type", "text"])
}

/// X11 `CLIPBOARD` as UTF-8, read straight from the owning X client.
///
/// Hyprland's XWayland bridge hangs when a Wayland client reads a clipboard
/// owned by WeChat: `wl-paste` never returns, while an X11 read answers in
/// ~10ms.
#[cfg(target_os = "linux")]
pub fn x11_clipboard_text(timeout: std::time::Duration) -> Option<String> {
    use x11rb::connection::Connection;
    use x11rb::protocol::xproto::{AtomEnum, ConnectionExt as _, CreateWindowAux, WindowClass};
    use x11rb::protocol::Event;

    let (conn, screen_num) = x11rb::connect(None).ok()?;
    let root = conn.setup().roots.get(screen_num)?.root;
    let window = conn.generate_id().ok()?;
    conn.create_window(
        x11rb::COPY_DEPTH_FROM_PARENT,
        window,
        root,
        0,
        0,
        1,
        1,
        0,
        WindowClass::INPUT_OUTPUT,
        x11rb::COPY_FROM_PARENT,
        &CreateWindowAux::new(),
    )
    .ok()?;

    let atom = |name: &[u8]| Some(conn.intern_atom(false, name).ok()?.reply().ok()?.atom);
    let clipboard = atom(b"CLIPBOARD")?;
    let utf8 = atom(b"UTF8_STRING")?;
    let property = atom(b"TYPO_SELECTION")?;

    conn.convert_selection(window, clipboard, utf8, property, x11rb::CURRENT_TIME)
        .ok()?;
    conn.flush().ok()?;

    let started = std::time::Instant::now();
    while started.elapsed() < timeout {
        match conn.poll_for_event() {
            Ok(Some(Event::SelectionNotify(event))) if event.requestor == window => {
                if event.property == x11rb::NONE {
                    return None;
                }
                let reply = conn
                    .get_property(true, window, property, AtomEnum::ANY, 0, u32::MAX / 4)
                    .ok()?
                    .reply()
                    .ok()?;
                // INCR (very large selections) is not supported.
                if reply.type_ != utf8 {
                    return None;
                }
                return String::from_utf8(reply.value).ok().filter(|t| !t.is_empty());
            }
            Ok(Some(_)) => {}
            Ok(None) => std::thread::sleep(std::time::Duration::from_millis(5)),
            Err(_) => return None,
        }
    }
    None
}

#[cfg(not(target_os = "linux"))]
pub fn x11_clipboard_text(_timeout: std::time::Duration) -> Option<String> {
    None
}

pub fn wl_copy_text(text: &str) -> bool {
    let mut child = match Command::new("wl-copy")
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(child) => child,
        Err(_) => return false,
    };

    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        let _ = stdin.write_all(text.as_bytes());
    }

    child.wait().map(|status| status.success()).unwrap_or(false)
}

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

// Linux input-event-codes.h — used by ydotool 1.0+ (`keycode:pressed`).
const KEY_C: u16 = 46;
const KEY_V: u16 = 47;
const KEY_LEFTCTRL: u16 = 29;
const KEY_LEFTSHIFT: u16 = 42;
const KEY_LEFTALT: u16 = 56;
const KEY_LEFTMETA: u16 = 125;

fn ydotool_key(key_events: &[&str]) -> bool {
    // Without a delay, press and release land in the same instant and the
    // focused app never sees the chord.
    Command::new("ydotool")
        .args(["key", "-d", "40"])
        .args(key_events)
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn active_window_json() -> Option<String> {
    let output = Command::new("hyprctl")
        .args(["activewindow", "-j"])
        .stderr(Stdio::null())
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&output.stdout).to_string())
}

fn json_field<'a>(json: &'a str, name: &str) -> Option<&'a str> {
    let key = format!("\"{name}\"");
    let rest = json.get(json.find(&key)? + key.len()..)?;
    Some(rest.get(rest.find(':')? + 1..)?.trim_start())
}

fn focused_window_class() -> Option<String> {
    let json = active_window_json()?;
    let rest = json_field(&json, "class")?.strip_prefix('"')?;
    Some(rest.get(..rest.find('"')?)?.to_string())
}

/// Focused window is an X11 client under XWayland (WeChat, for one).
pub fn focused_xwayland() -> bool {
    active_window_json()
        .and_then(|json| json_field(&json, "xwayland").map(|v| v.starts_with("true")))
        .unwrap_or(false)
}

/// Terminals copy with Ctrl+Shift+C. Ctrl+C is interrupt, so the CLI hotkey
/// (`typo --selection` on key release) would otherwise leave the clipboard
/// unchanged and fall through to a stale primary selection.
fn focused_terminal() -> bool {
    let Some(class) = focused_window_class() else {
        return false;
    };
    let class = class.to_lowercase();
    matches!(
        class.as_str(),
        "herdr"
            | "foot"
            | "kitty"
            | "alacritty"
            | "wezterm"
            | "ghostty"
            | "xterm"
            | "kgx"
            | "gnome-terminal"
    ) || class.contains("wezterm")
        || class.contains("ghostty")
}

fn ydotool_chord(events: &[(u16, u8)]) -> bool {
    let args: Vec<String> = events
        .iter()
        .map(|(code, pressed)| format!("{code}:{pressed}"))
        .collect();
    let refs: Vec<&str> = args.iter().map(String::as_str).collect();
    ydotool_key(&refs)
}

/// Release modifiers that may still be held from the system hotkey
/// (e.g. Ctrl+Shift+X) so the following Ctrl+C/V is not Ctrl+Shift+C/V.
fn ydotool_release_modifiers() {
    let _ = ydotool_chord(&[
        (KEY_LEFTCTRL, 0),
        (KEY_LEFTSHIFT, 0),
        (KEY_LEFTALT, 0),
    ]);
}

fn on_hyprland() -> bool {
    std::env::var_os("HYPRLAND_INSTANCE_SIGNATURE").is_some()
}

fn on_omarchy() -> bool {
    on_hyprland() && std::env::var_os("OMARCHY_PATH").is_some()
}

/// Press Super+<key> so Omarchy's universal clipboard binding picks the right
/// chord for the focused window (Ctrl+C, or Ctrl+Insert in terminals).
fn omarchy_super_shortcut(key: u16) -> bool {
    ydotool_chord(&[(KEY_LEFTMETA, 1), (key, 1), (key, 0), (KEY_LEFTMETA, 0)])
}

/// Omarchy Super+C / Super+V does this: ask Hyprland to deliver the chord to
/// the focused surface. ydotool injects a virtual keyboard, which XWayland
/// clients such as WeChat often drop until the key is repeated.
fn hyprland_send_key_state(mods: &str, key: &str, state: &str) -> bool {
    let lua = format!(
        "hl.dispatch(hl.dsp.send_key_state({{ mods = \"{mods}\", key = \"{key}\", state = \"{state}\" }}))"
    );
    let output = Command::new("hyprctl")
        .args(["repl", &lua])
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .output();
    match output {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            let failed = stdout.to_lowercase().contains("error")
                || stderr.to_lowercase().contains("error");
            !failed
        }
        _ => false,
    }
}

fn hyprland_tap(mods: &str, key: &str) -> bool {
    if !hyprland_send_key_state(mods, key, "down") {
        return false;
    }
    // Same 50ms down/up split Omarchy uses so the client sees a real press.
    std::thread::sleep(std::time::Duration::from_millis(50));
    hyprland_send_key_state(mods, key, "up")
}

fn copy_chord() -> (&'static str, &'static str) {
    if focused_terminal() {
        ("CTRL + SHIFT", "C")
    } else {
        ("CTRL", "C")
    }
}

/// Trigger Ctrl+C on Wayland.
///
/// On Omarchy, press Super+C and let its binding choose the chord. On plain
/// Hyprland, deliver the chord with `send_key_state`. Otherwise use ydotool
/// keycodes, then the legacy
/// `CTRL+c` syntax. On ydotool 1.0+, `CTRL+c` is a no-op that still exits 0,
/// so keycodes must be tried first.
pub fn ydotool_copy_shortcut() -> bool {
    ydotool_release_modifiers();
    // Let the compositor drop the system hotkey modifiers before the copy chord.
    std::thread::sleep(std::time::Duration::from_millis(50));

    if on_omarchy() {
        log::debug!("copy via omarchy SUPER+C");
        if omarchy_super_shortcut(KEY_C) {
            return true;
        }
        log::warn!("omarchy copy shortcut failed, falling back to send_key_state");
    }

    if on_hyprland() {
        let (mods, key) = copy_chord();
        log::debug!("copy via hyprland send_key_state {mods}+{key}");
        if hyprland_tap(mods, key) {
            return true;
        }
        log::warn!("hyprland copy shortcut failed, falling back to ydotool");
    }

    let chord: &[(u16, u8)] = if focused_terminal() {
        &[
            (KEY_LEFTCTRL, 1),
            (KEY_LEFTSHIFT, 1),
            (KEY_C, 1),
            (KEY_C, 0),
            (KEY_LEFTSHIFT, 0),
            (KEY_LEFTCTRL, 0),
        ]
    } else {
        &[
            (KEY_LEFTCTRL, 1),
            (KEY_C, 1),
            (KEY_C, 0),
            (KEY_LEFTCTRL, 0),
        ]
    };

    if ydotool_chord(chord) {
        return true;
    }

    ydotool_key(&["CTRL+c"])
}

/// Trigger Ctrl+V on Wayland (Hyprland `send_key_state`, then ydotool).
pub fn ydotool_paste_shortcut() -> bool {
    ydotool_release_modifiers();

    if on_omarchy() {
        log::debug!("paste via omarchy SUPER+V");
        if omarchy_super_shortcut(KEY_V) {
            return true;
        }
        log::warn!("omarchy paste shortcut failed, falling back to send_key_state");
    }

    if on_hyprland() && hyprland_tap("CTRL", "V") {
        return true;
    }

    if ydotool_chord(&[
        (KEY_LEFTCTRL, 1),
        (KEY_V, 1),
        (KEY_V, 0),
        (KEY_LEFTCTRL, 0),
    ]) {
        return true;
    }

    ydotool_key(&["CTRL+v"])
}

fn keyboard_paste_text_wayland(text: String, window: tauri::Window) -> Result<(), String> {
    let previous_clipboard = window.clipboard().read_text().unwrap_or_default();
    window
        .clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(50));

    let paste_ok = copyq_paste();
    if !paste_ok {
        let ydotool_ok = ydotool_paste_shortcut();
        if !ydotool_ok {
            enigo_paste().map_err(|e| {
                format!(
                    "Failed to paste from clipboard (copyq+ydotool+enigo): {}",
                    e
                )
            })?;
        }
    }

    std::thread::sleep(std::time::Duration::from_millis(50));

    if !previous_clipboard.is_empty() {
        let _ = window.clipboard().write_text(previous_clipboard);
    }

    Ok(())
}

#[tauri::command]
pub async fn keyboard_select_all(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(), String>>(1);
        app.run_on_main_thread(move || {
            let _ = tx.send(enigo_select_all());
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
        let _ = app;
        tauri::async_runtime::spawn_blocking(move || enigo_select_all())
            .await
            .map_err(|e| e.to_string())?
    }
}

#[tauri::command]
pub async fn keyboard_paste_text(text: String, window: tauri::Window) -> Result<(), String> {
    if crate::in_linux_wayland() {
        return tauri::async_runtime::spawn_blocking(move || {
            keyboard_paste_text_wayland(text, window)
        })
        .await
        .map_err(|e| e.to_string())?;
    }

    let previous_clipboard = window.clipboard().read_text().unwrap_or_default();

    window
        .clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    // On macOS, enigo MUST run on the main thread.
    // We use async sleep and only dispatch the actual enigo call to the main thread
    // to avoid stuttering.
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;

    #[cfg(target_os = "macos")]
    {
        let (tx, rx) = std::sync::mpsc::sync_channel::<Result<(), String>>(1);
        window
            .run_on_main_thread(move || {
                let _ = tx.send(enigo_paste());
            })
            .map_err(|e| e.to_string())?;

        tauri::async_runtime::spawn_blocking(move || {
            rx.recv().unwrap_or(Err("Paste failed".into()))
        })
        .await
        .map_err(|e| e.to_string())??;
    }

    #[cfg(not(target_os = "macos"))]
    {
        tauri::async_runtime::spawn_blocking(move || enigo_paste())
            .await
            .map_err(|e| e.to_string())??;
    }

    tokio::time::sleep(std::time::Duration::from_millis(50)).await;

    if !previous_clipboard.is_empty() {
        let _ = window.clipboard().write_text(previous_clipboard);
    }

    Ok(())
}
