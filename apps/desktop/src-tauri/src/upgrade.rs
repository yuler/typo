use std::sync::{atomic::{AtomicBool, AtomicUsize, Ordering}, RwLock};
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;
use tauri_plugin_updater::UpdaterExt;

static ACTIVITY_COUNTER: AtomicUsize = AtomicUsize::new(0);
static IGNORED_VERSION: RwLock<Option<String>> = RwLock::new(None);
static IS_CHECKING: AtomicBool = AtomicBool::new(false);
const ACTIVITY_THRESHOLD: usize = 10;
const UPDATER_STATE_FILE: &str = "updater.json";

struct CheckingGuard;

impl Drop for CheckingGuard {
    fn drop(&mut self) {
        IS_CHECKING.store(false, Ordering::Release);
    }
}

pub fn init(app: AppHandle) {
    // Load ignored version from store
    if let Ok(store) = app.store(UPDATER_STATE_FILE) {
        if let Some(version) = store.get("ignored_version") {
            if let Some(v_str) = version.as_str() {
                let mut ignored = IGNORED_VERSION.write().unwrap_or_else(|e| e.into_inner());
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

#[tauri::command]
pub fn increment_activity(app: AppHandle) {
    let old = ACTIVITY_COUNTER.fetch_add(1, Ordering::Relaxed);
    if (old + 1) % ACTIVITY_THRESHOLD == 0 {
        let handle = app.clone();
        tauri::async_runtime::spawn(async move {
            check_update_silent(&handle).await;
        });
    }
}

async fn check_update_silent(app: &AppHandle) {
    if app.get_webview_window("upgrade").is_some() {
        log::debug!("Upgrade window is already open, skipping update check");
        return;
    }

    if IS_CHECKING.compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed).is_err() {
        log::debug!("Update check already in progress, skipping");
        return;
    }
    let _guard = CheckingGuard;

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

            let is_ignored = IGNORED_VERSION.read().unwrap().as_ref() == Some(&version);
            if is_ignored {
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
    if let Ok(store) = app.store(UPDATER_STATE_FILE) {
        store.set("ignored_version", serde_json::Value::String(version));
        if let Err(e) = store.save() {
            log::error!("Failed to save ignored_version to store: {}", e);
        }
    }
}
