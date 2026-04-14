pub fn typo_default_accelerators_to_xdg() -> Vec<(&'static str, &'static str, &'static str)> {
    vec![
        ("typo.open_main", "Open Typo on selected text", "<Primary><Shift>x"),
        ("typo.open_settings", "Open Typo settings", "<Primary>comma"),
    ]
}

/// Maps the subset of strings Typo uses today to XDG shortcut triggers.
/// Spec: https://specifications.freedesktop.org/shortcuts-spec/shortcuts-latest.html
#[allow(dead_code)]
pub fn tauri_style_to_xdg_trigger(input: &str) -> Option<String> {
    let parts: Vec<&str> = input.split('+').map(str::trim).collect();
    let mut mods: Vec<&str> = Vec::new();
    let mut key: Option<&str> = None;
    for p in parts {
        match p {
            "CommandOrControl" | "Ctrl" => mods.push("<Primary>"),
            "Shift" => mods.push("<Shift>"),
            "Alt" => mods.push("<Alt>"),
            "Super" => mods.push("<Super>"),
            k if key.is_none() => key = Some(k),
            _ => return None,
        }
    }
    let k = key?;
    let key_part = match k {
        "X" | "x" => "x",
        "," => "comma",
        _ => return None,
    };
    let mut out = String::new();
    for m in mods {
        out.push_str(m);
    }
    out.push_str(key_part);
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_main_shortcut() {
        assert_eq!(
            tauri_style_to_xdg_trigger("CommandOrControl+Shift+X").as_deref(),
            Some("<Primary><Shift>x")
        );
    }

    #[test]
    fn maps_settings_shortcut() {
        assert_eq!(
            tauri_style_to_xdg_trigger("CommandOrControl+,").as_deref(),
            Some("<Primary>comma")
        );
    }
}
