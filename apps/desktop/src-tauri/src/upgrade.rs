use std::sync::{atomic::{AtomicUsize, Ordering}, RwLock};
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

static ACTIVITY_COUNTER: AtomicUsize = AtomicUsize::new(0);
static IGNORED_VERSION: RwLock<Option<String>> = RwLock::new(None);
const ACTIVITY_THRESHOLD: usize = 10;

pub fn init(app: AppHandle) {
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        // Initial delay of 1 minute
        tokio::time::sleep(std::time::Duration::from_secs(60)).await;
        let _ = check_update_silent(&handle).await;
    });
}

pub fn increment_activity(app: &AppHandle) {
    let current = ACTIVITY_COUNTER.fetch_add(1, Ordering::SeqCst) + 1;
    if current >= ACTIVITY_THRESHOLD {
        ACTIVITY_COUNTER.store(0, Ordering::SeqCst);
        let handle = app.clone();
        tauri::async_runtime::spawn(async move {
            let _ = check_update_silent(&handle).await;
        });
    }
}

async fn check_update_silent(app: &AppHandle) -> Result<(), String> {
    log::info!("Checking for updates (activity-triggered)");
    let updater = app.updater().map_err(|e| e.to_string())?;
    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        let version = update.version.clone();
        
        let ignored = IGNORED_VERSION.read().unwrap();
        if Some(version.clone()) == *ignored {
            log::info!("Update v{} is ignored, skipping window", version);
            return Ok(());
        }
        
        log::info!("New version v{} found, opening upgrade window", version);
        crate::windows::create_upgrade_window(app);
    } else {
        log::info!("No updates found");
    }
    Ok(())
}

#[tauri::command]
pub fn ignore_version(version: String) {
    let version_clone = version.clone();
    let mut ignored = IGNORED_VERSION.write().unwrap();
    *ignored = Some(version);
    log::info!("Version v{} will be ignored for automatic checks", version_clone);
}
