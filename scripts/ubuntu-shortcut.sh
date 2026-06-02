#!/bin/bash
set -euo pipefail

# Settings -> Keyboard -> Custom Shortcuts

# Default values
MODE="global"
CMD="typo --selection"
BINDING="<Control><Shift>x"
QUICK_PICK_CMD="typo --quick-pick"
QUICK_PICK_BINDING="<Control><Shift>z"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --dev) MODE="local"; shift ;;
        --global) MODE="global"; shift ;;
        --binding|-b) BINDING="$2"; shift 2 ;;
        --quick-pick-binding|-q) QUICK_PICK_BINDING="$2"; shift 2 ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev            Set the shortcut command for local debug build"
            echo "  --global         Set the shortcut command for global installation (default)"
            echo "  --binding, -b    Specify the shortcut binding (default: <Control><Shift>x)"
            echo "  --quick-pick-binding, -q Specify the quick pick shortcut binding (default: <Control><Shift>z)"
            echo "  --help, -h       Show this help message and exit"
            exit 0
            ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
done

if [[ "$MODE" == "local" ]]; then
    # Use absolute path for local debug build
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    REPO_ROOT="$(dirname "$SCRIPT_DIR")"
    CMD="$REPO_ROOT/apps/desktop/src-tauri/target/debug/typo --selection"
    QUICK_PICK_CMD="$REPO_ROOT/apps/desktop/src-tauri/target/debug/typo --quick-pick"
fi

# Optional gum-driven prompts (only if gum is installed)
INSTALL_SELECTION=true
INSTALL_QUICK_PICK=true
if command -v gum >/dev/null 2>&1; then
    if gum confirm "Set up/update GNOME shortcuts for Typo?" ; then
        choice="$(gum choose "Both shortcuts" "Only selection" "Only quick pick")"
        case "$choice" in
            "Both shortcuts") ;;
            "Only selection")
                INSTALL_QUICK_PICK=false
                ;;
            "Only quick pick")
                INSTALL_SELECTION=false
                ;;
            *)
                # Should be unreachable, but keep safe defaults.
                ;;
        esac
    else
        echo "Canceled."
        exit 0
    fi
fi

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
    gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$key_path" name "'$name'"
    gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$key_path" command "\"$command\""
    gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$key_path" binding "'$binding'"

    echo "Shortcut '$name' setup successfully ($key_path) [$MODE mode]:"
    echo "  Binding: $binding"
    echo "  Command: $command"
}

if [[ "$INSTALL_SELECTION" == "true" ]]; then
    setup_keybinding "Typo" \
        "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom-typo/" \
        "$CMD" "$BINDING"
fi

if [[ "$INSTALL_QUICK_PICK" == "true" ]]; then
    setup_keybinding "Typo Quick Pick" \
        "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom-typo-quick-pick/" \
        "$QUICK_PICK_CMD" "$QUICK_PICK_BINDING"
fi
