#!/bin/bash
set -euo pipefail

# Omarchy status bar plugin installer for Typo.
# Links apps/omarchy-plugin to ~/.config/omarchy/plugins/typo
# and registers { "id": "typo" } in ~/.config/omarchy/shell.json.

warn() {
    echo "⚠️  [WARN] $*" >&2
}

info() {
    echo "ℹ️  $*"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_PLUGIN="$REPO_DIR/apps/omarchy-plugin"

OMARCHY_CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/omarchy"
PLUGINS_DIR="$OMARCHY_CONFIG_DIR/plugins"
TARGET_LINK="$PLUGINS_DIR/typo"
SHELL_CONFIG="$OMARCHY_CONFIG_DIR/shell.json"

if [[ ! -d "$SOURCE_PLUGIN" ]]; then
    echo "❌ Source plugin directory not found: $SOURCE_PLUGIN" >&2
    exit 1
fi

mkdir -p "$PLUGINS_DIR"

# 1. Create or update symlink
ln -sfn "$SOURCE_PLUGIN" "$TARGET_LINK"
info "Linked plugin: $TARGET_LINK -> $SOURCE_PLUGIN"

# 2. Update ~/.config/omarchy/shell.json
if [[ -f "$SHELL_CONFIG" ]]; then
    python3 - <<EOF
import json
import sys

config_path = "$SHELL_CONFIG"
try:
    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception as e:
    print(f"Failed to read {config_path}: {e}", file=sys.stderr)
    sys.exit(1)

bar = data.get("bar", {})
layout = bar.get("layout", {})
right = layout.get("right", [])

# Check if typo already present
already_exists = any(item.get("id") == "typo" for item in right if isinstance(item, dict))

if not already_exists:
    typo_entry = {"id": "typo"}
    # Insert right after omarchy.tray or right before beep, else append
    tray_idx = -1
    beep_idx = -1
    for idx, item in enumerate(right):
        if isinstance(item, dict):
            if item.get("id") == "omarchy.tray":
                tray_idx = idx
            elif item.get("id") == "beep":
                beep_idx = idx

    if beep_idx != -1:
        right.insert(beep_idx, typo_entry)
    elif tray_idx != -1:
        right.insert(tray_idx + 1, typo_entry)
    else:
        right.insert(0, typo_entry)

    layout["right"] = right
    bar["layout"] = layout
    data["bar"] = bar

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("Registered 'typo' widget in ~/.config/omarchy/shell.json")
else:
    print("'typo' widget is already registered in ~/.config/omarchy/shell.json")
EOF
else
    warn "$SHELL_CONFIG does not exist. Please add { \"id\": \"typo\" } to your bar configuration."
fi

# 3. Ask Omarchy shell to rescan plugins
if command -v omarchy-shell >/dev/null 2>&1; then
    omarchy-shell shell rescanPlugins >/dev/null 2>&1 || true
    omarchy-shell -q typo setStatus idle >/dev/null 2>&1 || true
fi

echo ""
echo "============================================="
echo "  ✅ Typo Omarchy Topbar plugin configured"
echo "============================================="
echo "  Plugin link   $TARGET_LINK"
echo "  Config file   $SHELL_CONFIG"
echo "  Position      Top status bar (right section)"
echo "============================================="
echo ""
