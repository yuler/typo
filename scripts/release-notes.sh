#!/bin/bash

# 1. Fetch releases and let user choose a tag
echo "Fetching releases..."
SELECTED_RELEASE=$(gh release list --limit 20 | fzf --header "Select a release to update latest.json notes" --preview "gh release view {1}")

if [ -z "$SELECTED_RELEASE" ]; then
    echo "No release selected. Exiting."
    exit 1
fi

TAG=$(echo "$SELECTED_RELEASE" | awk '{print $1}')
echo "Selected Tag: $TAG"

# 2. Download latest.json to tmp folder
TMP_DIR=$(mktemp -d)
JSON_FILE="$TMP_DIR/latest.json"

echo "Downloading latest.json..."
# Using pattern to find the exact file
gh release download "$TAG" --pattern "latest.json" --dir "$TMP_DIR"

if [ ! -f "$JSON_FILE" ]; then
    echo "Error: latest.json not found in release $TAG"
    rm -rf "$TMP_DIR"
    exit 1
fi

# 3. Preview current notes
CURRENT_NOTES=$(jq -r '.notes // ""' "$JSON_FILE")
echo ""
echo "------------------------------------------------"
echo "Current Notes in latest.json:"
echo "------------------------------------------------"
echo "$CURRENT_NOTES"
echo "------------------------------------------------"
echo ""

# 4. Let user input new notes
# Using a temporary file for editing to handle multi-line input comfortably
NEW_NOTES_FILE="$TMP_DIR/new_notes.txt"
echo "$CURRENT_NOTES" > "$NEW_NOTES_FILE"

echo "Opening editor for new notes... (Modify and save)"
# Use EDITOR or fall back to vi
${EDITOR:-vi} "$NEW_NOTES_FILE"

NEW_NOTES=$(cat "$NEW_NOTES_FILE")

# 5. Update latest.json locally
jq --arg notes "$NEW_NOTES" '.notes = $notes' "$JSON_FILE" > "$JSON_FILE.tmp" && mv "$JSON_FILE.tmp" "$JSON_FILE"

# 6. Upload back to GitHub to update the asset
echo "Uploading updated latest.json to release $TAG..."
gh release upload "$TAG" "$JSON_FILE" --clobber

echo "------------------------------------------------"
echo "Successfully updated latest.json's notes field."
echo "------------------------------------------------"

# Clean up
rm -rf "$TMP_DIR"
