use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};

fn log_file_target() -> Target {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var_os("HOME")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|| std::path::PathBuf::from("."));
        return Target::new(TargetKind::Folder {
            path: home.join("Library").join("Logs").join("Typo"),
            file_name: Some("typo".into()),
        });
    }

    #[cfg(not(target_os = "macos"))]
    {
        Target::new(TargetKind::LogDir {
            file_name: Some("typo".into()),
        })
    }
}

pub(crate) fn log_plugin_builder() -> tauri_plugin_log::Builder {
    let builder = tauri_plugin_log::Builder::new()
        .timezone_strategy(TimezoneStrategy::UseLocal)
        .max_file_size(5 * 1024 * 1024)
        .rotation_strategy(RotationStrategy::KeepSome(3));

    if cfg!(debug_assertions) {
        builder
            .level(log::LevelFilter::Debug)
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::Webview),
                log_file_target(),
            ])
    } else {
        builder
            .level(log::LevelFilter::Info)
            .targets([log_file_target()])
    }
}
