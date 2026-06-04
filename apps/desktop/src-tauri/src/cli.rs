const SELECTION_FLAG: &str = "--selection";
const VERSION_FLAG: &str = "--version";
const QUICK_PICK_FLAG: &str = "--quick-pick";

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

pub fn has_quick_pick_flag<I, S>(args: I) -> bool
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter().any(|arg| arg.as_ref() == QUICK_PICK_FLAG)
}

pub fn handle_single_instance_event(
    app: &tauri::AppHandle,
    argv: &[String],
    _is_wayland: bool,
    selection_handler: fn(&tauri::AppHandle),
    quick_pick_handler: fn(&tauri::AppHandle),
) {
    use tauri::Manager;

    if has_version_flag(argv.iter().map(|arg| arg.as_str())) {
        println!("typo {}", env!("CARGO_PKG_VERSION"));
        return;
    }

    if has_selection_flag(argv.iter().map(|arg| arg.as_str())) {
        selection_handler(app);
        return;
    }

    if has_quick_pick_flag(argv.iter().map(|arg| arg.as_str())) {
        quick_pick_handler(app);
        return;
    }

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        // TODO: option in settings
        // let _ = window.set_focus();
    }
}

