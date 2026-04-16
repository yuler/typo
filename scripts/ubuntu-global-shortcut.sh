#!/bin/bash
set -euo pipefail

# Settings -> Keyboard -> Custom Shortcuts

# Default values
MODE="global"
CMD="typo --selection"
BINDING="<Control><Shift>x"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --local) MODE="local"; shift ;;
        --global) MODE="global"; shift ;;
        --binding|-b) BINDING="$2"; shift 2 ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
done

if [[ "$MODE" == "local" ]]; then
    # Use absolute path for local debug build
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    REPO_ROOT="$(dirname "$SCRIPT_DIR")"
    CMD="$REPO_ROOT/src-tauri/target/debug/typo --selection"
fi

# 1. Check if a shortcut named "Typo" already exists
current_bindings=$(gsettings get org.gnome.settings-daemon.plugins.media-keys custom-keybindings)
NEW_KEY_PATH=""

# Extract the quoted strings and iterate over them safely using a while loop
while read -r p; do
    # Remove single quotes
    p=$(echo "$p" | tr -d "'")
    if [ -n "$p" ]; then
        name=$(gsettings get "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$p" name 2>/dev/null || true)
        if [[ "$name" == "'Typo'" ]]; then
            NEW_KEY_PATH=$p
            break
        fi
    fi
done < <(echo "$current_bindings" | grep -o "'[^']*'")

# If not found, use default path and add it to the list
if [ -z "$NEW_KEY_PATH" ]; then
    NEW_KEY_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom-typo/"

    # Add the new path to the system "master list"
    if [[ "$current_bindings" != *"$NEW_KEY_PATH"* ]]; then
        # Reconstruct the bindings list safely
        new_bindings="["
        while read -r p; do
            p=$(echo "$p" | tr -d "'")
            if [ -n "$p" ]; then
                new_bindings+="'$p', "
            fi
        done < <(echo "$current_bindings" | grep -o "'[^']*'")
        new_bindings+="'$NEW_KEY_PATH']"
        
        gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings "$new_bindings"
    fi
fi

# 2. Set/Update the specific properties of the shortcut
gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$NEW_KEY_PATH" name "'Typo'"
gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$NEW_KEY_PATH" command "\"$CMD\""
gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$NEW_KEY_PATH" binding "'$BINDING'"

echo "Shortcut setup successfully ($NEW_KEY_PATH) [$MODE mode]:"
echo "  Binding: $BINDING"
echo "  Command: $CMD"
