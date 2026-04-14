use tauri_plugin_notification::NotificationExt;

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
    if has_version_flag(argv.iter().map(|arg| arg.as_str())) {
        println!("typo {}", env!("CARGO_PKG_VERSION"));
        return;
    }

    if has_selection_flag(argv.iter().map(|arg| arg.as_str())) && is_wayland {
        selection_handler(app);
        return;
    }

    notify_existing_instance(app);
}

fn notify_existing_instance(app: &tauri::AppHandle) {
    if let Err(error) = app
        .notification()
        .builder()
        .title("This app is already running!")
        .body("You can find it in the tray menu.")
        .show()
    {
        eprintln!("Failed to show existing-instance notification: {}", error);
    }
}
