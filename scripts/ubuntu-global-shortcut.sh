#!/bin/bash

# Settings -> Keyboard -> Custom Shortcuts

# Default values
MODE="global"
CMD="typo --selection"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --local) MODE="local"; shift ;;
        --global) MODE="global"; shift ;;
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

# Convert ['path1', 'path2'] to a space-separated list of paths
paths=$(echo "$current_bindings" | tr -d "[]'," | sed "s/@as //g")

for p in $paths; do
    # Remove potential single quotes
    p=$(echo "$p" | tr -d "'")
    if [ -n "$p" ]; then
        name=$(gsettings get org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$p name 2>/dev/null)
        if [[ "$name" == "'Typo'" ]]; then
            NEW_KEY_PATH=$p
            break
        fi
    fi
done

# If not found, use default path and add it to the list
if [ -z "$NEW_KEY_PATH" ]; then
    NEW_KEY_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom-typo/"

    # Add the new path to the system "master list"
    if [[ "$current_bindings" != *"$NEW_KEY_PATH"* ]]; then
        if [[ "$current_bindings" == "[]" || "$current_bindings" == "@as []" ]]; then
            new_bindings="['$NEW_KEY_PATH']"
        else
            new_bindings="${current_bindings%]*}, '$NEW_KEY_PATH']"
        fi
        gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings "$new_bindings"
    fi
fi

# 2. Set/Update the specific properties of the shortcut
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$NEW_KEY_PATH name "'Typo'"
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$NEW_KEY_PATH command "'$CMD'"
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$NEW_KEY_PATH binding "'<Control><Shift>x'"

echo "Shortcut setup successfully ($NEW_KEY_PATH) [$MODE mode]:"
echo "  Binding: Ctrl + Shift + X"
echo "  Command: $CMD"
