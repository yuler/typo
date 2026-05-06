use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};

pub(crate) fn log_plugin_builder() -> tauri_plugin_log::Builder {
    let builder = tauri_plugin_log::Builder::new()
        .timezone_strategy(TimezoneStrategy::UseLocal)
        .max_file_size(5 * 1024 * 1024)
        .rotation_strategy(RotationStrategy::KeepSome(3));

    let log_dir_target = Target::new(TargetKind::LogDir {
        file_name: Some("typo".into()),
    });

    if cfg!(debug_assertions) {
        builder
            .level(log::LevelFilter::Debug)
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::Webview),
                log_dir_target,
            ])
    } else {
        builder
            .level(log::LevelFilter::Info)
            .targets([log_dir_target])
    }
}
