use serde::Serialize;
use std::sync::{LazyLock, Mutex};

#[derive(Debug, Clone, Serialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum ShortcutRegistrationBackend {
    #[default]
    None,
    Portal,
    Plugin,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub struct ShortcutRegistrationStatus {
    pub backend: ShortcutRegistrationBackend,
    pub plugin_fallback_attempted: bool,
    pub error_message: Option<String>,
}

static SHORTCUT_STATUS: LazyLock<Mutex<ShortcutRegistrationStatus>> =
    LazyLock::new(|| Mutex::new(ShortcutRegistrationStatus::default()));

pub fn get_shortcut_registration_status() -> ShortcutRegistrationStatus {
    SHORTCUT_STATUS
        .lock()
        .expect("shortcut status mutex poisoned")
        .clone()
}

pub(crate) fn set_shortcut_registration_status(s: ShortcutRegistrationStatus) {
    *SHORTCUT_STATUS
        .lock()
        .expect("shortcut status mutex poisoned") = s;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_snake_case() {
        let s = ShortcutRegistrationStatus {
            backend: ShortcutRegistrationBackend::Portal,
            plugin_fallback_attempted: false,
            error_message: None,
        };
        let v = serde_json::to_value(&s).unwrap();
        assert_eq!(v["backend"], "portal");
    }
}
