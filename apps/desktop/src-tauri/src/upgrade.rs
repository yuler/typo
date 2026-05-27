use std::sync::{atomic::{AtomicUsize, Ordering}, RwLock};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use tauri_plugin_updater::UpdaterExt;

static ACTIVITY_COUNTER: AtomicUsize = AtomicUsize::new(0);
static IGNORED_VERSION: RwLock<Option<String>> = RwLock::new(None);
const ACTIVITY_THRESHOLD: usize = 10;
const SETTINGS_FILE: &str = "settings.json";

pub fn init(app: AppHandle) {
    // Load ignored version from store
    if let Some(store) = app.get_store(SETTINGS_FILE) {
        if let Some(version) = store.get("ignored_version") {
            if let Some(v_str) = version.as_str() {
                let mut ignored = IGNORED_VERSION.write().unwrap();
                *ignored = Some(v_str.to_string());
                log::info!("Loaded ignored version from store: v{}", v_str);
            }
        }
    }

    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        // Initial delay of 1 minute
        tokio::time::sleep(std::time::Duration::from_secs(60)).await;
        check_update_silent(&handle).await;
    });
}

pub fn increment_activity(app: &AppHandle) {
    let result = ACTIVITY_COUNTER.fetch_update(Ordering::SeqCst, Ordering::SeqCst, |val| {
        let next = val + 1;
        if next >= ACTIVITY_THRESHOLD {
            Some(0)
        } else {
            Some(next)
        }
    });

    if let Ok(old) = result {
        if old + 1 >= ACTIVITY_THRESHOLD {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                let _ = check_update_silent(&handle).await;
            });
        }
    }
}

async fn check_update_silent(app: &AppHandle) {
    log::info!("Checking for updates (activity-triggered)");
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            log::error!("Failed to get updater: {}", e);
            return;
        }
    };

    match updater.check().await {
        Ok(Some(update)) => {
            let version = update.version;

            let ignored = IGNORED_VERSION.read().unwrap();
            if ignored.as_ref() == Some(&version) {
                log::info!("Update v{} is ignored, skipping window", version);
                return;
            }

            log::info!("New version v{} found, opening upgrade window", version);
            crate::windows::create_upgrade_window(app);
        }
        Ok(None) => {
            log::info!("No updates found");
        }
        Err(e) => {
            log::error!("Update check failed: {}", e);
        }
    }
}

#[tauri::command]
pub fn ignore_version(app: AppHandle, version: String) {
    log::info!("Version v{} will be ignored for automatic checks", version);
    
    // Update memory state
    {
        let mut ignored = IGNORED_VERSION.write().unwrap();
        *ignored = Some(version.clone());
    }

    // Update local store
    if let Some(store) = app.get_store(SETTINGS_FILE) {
        store.set("ignored_version", serde_json::Value::String(version));
        if let Err(e) = store.save() {
            log::error!("Failed to save ignored_version to store: {}", e);
        }
    }
}
