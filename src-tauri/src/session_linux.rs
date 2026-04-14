#[cfg(target_os = "linux")]
pub fn session_kind_from_env() -> SessionKind {
    session_kind_from(
        std::env::var_os("WAYLAND_DISPLAY"),
        std::env::var_os("DISPLAY"),
    )
}

#[cfg(target_os = "linux")]
fn session_kind_from(
    wayland_display: Option<std::ffi::OsString>,
    x11_display: Option<std::ffi::OsString>,
) -> SessionKind {
    if wayland_display.is_some() {
        return SessionKind::Wayland;
    }
    if x11_display.is_some() {
        return SessionKind::X11;
    }
    SessionKind::Unknown
}

#[cfg(target_os = "linux")]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionKind {
    Wayland,
    X11,
    Unknown,
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::*;

    #[test]
    fn wayland_wins_when_both_set() {
        assert_eq!(
            session_kind_from(Some(":1".into()), Some(":0".into())),
            SessionKind::Wayland
        );
    }

    #[test]
    fn x11_only_when_wayland_missing() {
        assert_eq!(
            session_kind_from(None, Some(":0".into())),
            SessionKind::X11
        );
    }

    #[test]
    fn unknown_when_neither_set() {
        assert_eq!(session_kind_from(None, None), SessionKind::Unknown);
    }
}
