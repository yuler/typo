const SELECTION_FLAG: &str = "--selection";
const VERSION_FLAG: &str = "--version";

pub fn has_selection_flag<I, S>(args: I) -> bool
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter().any(|arg| arg.as_ref() == SELECTION_FLAG)
}

pub fn has_version_flag<I, S>(args: I) -> bool
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter().any(|arg| arg.as_ref() == VERSION_FLAG)
}

pub fn handle_single_instance_event(
    app: &tauri::AppHandle,
    argv: &[String],
    is_wayland: bool,
    selection_handler: fn(&tauri::AppHandle),
) {
    use tauri::{Manager, Emitter};

    if has_version_flag(argv.iter().map(|arg| arg.as_str())) {
        println!("typo {}", env!("CARGO_PKG_VERSION"));
        return;
    }

    if has_selection_flag(argv.iter().map(|arg| arg.as_str())) && is_wayland {
        selection_handler(app);
        return;
    }

    // Handle deep links in single instance
    for arg in argv {
        if arg.starts_with("typo://") {
            let _ = app.emit("deep-link://link", vec![arg.clone()]);
        }
    }

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

