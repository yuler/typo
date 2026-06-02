const SELECTION_FLAG: &str = "--selection";
const VERSION_FLAG: &str = "--version";
const HELP_FLAG: &str = "--help";
const HELP_SHORT_FLAG: &str = "-h";

enum CliCommand {
    None,
    Selection,
    Version,
    Help,
}

pub struct StartupCliOptions {
    pub should_exit: bool,
    pub startup_selection: bool,
}

fn detect_command<I, S>(args: I) -> CliCommand
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    let mut has_selection = false;

    for arg in args {
        let arg = arg.as_ref();
        if arg == VERSION_FLAG {
            return CliCommand::Version;
        }
        if arg == HELP_FLAG || arg == HELP_SHORT_FLAG {
            return CliCommand::Help;
        }
        if arg == SELECTION_FLAG {
            has_selection = true;
        }
    }

    if has_selection {
        CliCommand::Selection
    } else {
        CliCommand::None
    }
}

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

pub fn evaluate_startup_options<I, S>(args: I, is_wayland: bool) -> StartupCliOptions
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    match detect_command(args) {
        CliCommand::Version => {
            println!("typo {}", env!("CARGO_PKG_VERSION"));
            StartupCliOptions {
                should_exit: true,
                startup_selection: false,
            }
        }
        CliCommand::Help => {
            println!("Usage: typo [OPTIONS]");
            println!();
            println!("Options:");
            println!("  --selection    Trigger selection mode (Wayland startup path)");
            println!("  --version      Print version");
            println!("  --help, -h     Show this help message");
            StartupCliOptions {
                should_exit: true,
                startup_selection: false,
            }
        }
        CliCommand::Selection => StartupCliOptions {
            should_exit: false,
            startup_selection: is_wayland,
        },
        CliCommand::None => StartupCliOptions {
            should_exit: false,
            startup_selection: false,
        },
    }
}

pub fn handle_single_instance_event(
    app: &tauri::AppHandle,
    argv: &[String],
    is_wayland: bool,
    selection_handler: fn(&tauri::AppHandle),
) {
    use tauri::Manager;

    match detect_command(argv.iter().map(|arg| arg.as_str())) {
        CliCommand::Version => {
            println!("typo {}", env!("CARGO_PKG_VERSION"));
            return;
        }
        CliCommand::Help => {
            println!("Usage: typo [OPTIONS]");
            println!();
            println!("Options:");
            println!("  --selection    Trigger selection mode (Wayland startup path)");
            println!("  --version      Print version");
            println!("  --help, -h     Show this help message");
            return;
        }
        CliCommand::Selection if is_wayland => {
            selection_handler(app);
            return;
        }
        CliCommand::Selection | CliCommand::None => {}
    }

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        // TODO: option in settings
        // let _ = window.set_focus();
    }
}

