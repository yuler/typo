#!/bin/bash
set -euo pipefail

# Settings -> Keyboard -> Custom Shortcuts

if ! command -v gum >/dev/null 2>&1; then
    echo "gum is required. Install from https://github.com/charmbracelet/gum" >&2
    exit 1
fi

warn() { gum log -l warn "$@"; }

# Default values
MODE="global"
CMD="typo --selection"
BINDING="<Control><Shift>x"
QUICK_PICK_BINDING="<Control><Shift>space"
SHORTCUT_ROWS=()

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --dev) MODE="local"; shift ;;
        --global) MODE="global"; shift ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev            Set the shortcut command for local debug build"
            echo "  --global         Set the shortcut command for global installation (default)"
            echo "  --help, -h       Show this help message and exit"
            echo ""
            echo "Shortcuts: Typo <Control><Shift>x, Typo Quick Pick <Control><Shift>space"
            exit 0
            ;;
        *) gum log -l error "Unknown parameter passed: $1"; exit 1 ;;
    esac
done

if [[ "$MODE" == "local" ]]; then
    # Use absolute path for local debug build
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    REPO_ROOT="$(dirname "$SCRIPT_DIR")"
    TYPO_BIN="$REPO_ROOT/apps/desktop/src-tauri/target/debug/typo"
    CMD="\"$TYPO_BIN\" --selection"
    QUICK_PICK_BIN="$TYPO_BIN"
else
    QUICK_PICK_BIN="typo"
fi

# Wrap with xdotool so GNOME can raise the quick pick window (stored as bash -c '...' for gsettings).
if command -v xdotool >/dev/null 2>&1; then
    quick_pick_script="${QUICK_PICK_BIN} --quick-pick; for i in {1..10}; do xid=\$(xdotool search --onlyvisible --name \"^typo - Quick Pick\$\" | head -n 1); if [ -n \"\$xid\" ]; then xdotool windowactivate \$xid; break; fi; sleep 0.05; done"
    QUICK_PICK_CMD="bash -c '${quick_pick_script}'"
else
    QUICK_PICK_CMD="${QUICK_PICK_BIN} --quick-pick"
fi

gsettings_unquote() {
    local value="$1"
    value="${value#\'}"
    value="${value%\'}"
    printf '%s' "$value"
}

# Warn if another shortcut already uses Typo's bindings.
check_binding_conflicts() {
    local current_bindings binding_conflict=false

    current_bindings=$(gsettings get org.gnome.settings-daemon.plugins.media-keys custom-keybindings)

    while read -r p; do
        p=$(echo "$p" | tr -d "'")
        if [ -z "$p" ]; then
            continue
        fi

        local name_raw binding_raw
        name_raw=$(gsettings get "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$p" name 2>/dev/null || echo "''")
        binding_raw=$(gsettings get "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$p" binding 2>/dev/null || echo "''")

        local name binding
        name=$(gsettings_unquote "$name_raw")
        binding=$(gsettings_unquote "$binding_raw")

        if [[ "$binding" == "$BINDING" || "$binding" == "$QUICK_PICK_BINDING" ]]; then
            if [[ "$name" != "Typo" && "$name" != "Typo Quick Pick" ]]; then
                binding_conflict=true
            fi
        fi
    done < <(echo "$current_bindings" | grep -o "'[^']*'")

    if [[ "$binding_conflict" == "true" ]]; then
        warn "Another shortcut already uses $BINDING or $QUICK_PICK_BINDING."
        warn "Disable or rebind it in Settings -> Keyboard -> Custom Shortcuts."
    fi
}

check_binding_conflicts

# Register (create or update) a single custom keybinding identified by NAME.
# Arguments: <name> <default-path> <command> <binding>
setup_keybinding() {
    local name="$1"
    local default_path="$2"
    local command="$3"
    local binding="$4"

    local current_bindings
    current_bindings=$(gsettings get org.gnome.settings-daemon.plugins.media-keys custom-keybindings)
    local key_path=""

    # 1. Check if a shortcut with this name already exists
    while read -r p; do
        # Remove single quotes
        p=$(echo "$p" | tr -d "'")
        if [ -n "$p" ]; then
            local existing_name
            existing_name=$(gsettings get "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$p" name 2>/dev/null || true)
            if [[ "$existing_name" == "'$name'" ]]; then
                key_path=$p
                break
            fi
        fi
    done < <(echo "$current_bindings" | grep -o "'[^']*'")

    # If not found, use the default path and add it to the master list
    if [ -z "$key_path" ]; then
        key_path="$default_path"

        if [[ "$current_bindings" != *"$key_path"* ]]; then
            # Reconstruct the bindings list safely
            local new_bindings="["
            while read -r p; do
                p=$(echo "$p" | tr -d "'")
                if [ -n "$p" ]; then
                    new_bindings+="'$p', "
                fi
            done < <(echo "$current_bindings" | grep -o "'[^']*'")
            new_bindings+="'$key_path']"

            gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings "$new_bindings"
        fi
    fi

    # 2. Set/Update the specific properties of the shortcut
    # gsettings strings use \' for embedded quotes (not bash '\'' concatenation).
    local escaped_command="${command//\'/\\\'}"
    gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$key_path" name "'$name'"
    gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$key_path" command "'$escaped_command'"
    gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$key_path" binding "'$binding'"

    SHORTCUT_ROWS+=("${name}"$'\t'"${binding}")
}

show_results() {
    local lines=("✅ Typo shortcuts configured [$MODE mode]" "")

    for row in "${SHORTCUT_ROWS[@]}"; do
        local name binding
        name="${row%%$'\t'*}"
        binding="${row#*$'\t'}"
        lines+=("$(printf '%-17s %s' "$name" "$binding")")
    done

    echo ""
    gum style \
        --border rounded \
        --padding "1 2" \
        --border-foreground 82 \
        "${lines[@]}"
    echo ""
}

setup_keybinding "Typo" \
    "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom-typo/" \
    "$CMD" "$BINDING"

setup_keybinding "Typo Quick Pick" \
    "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom-typo-quick-pick/" \
    "$QUICK_PICK_CMD" "$QUICK_PICK_BINDING"

show_results
