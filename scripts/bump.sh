#!/bin/bash

# Check if version argument is provided
if [ -z "$1" ]; then
    version=$(gum choose --header "Select version type:" "patch" "minor" "major")
    if [ -z "$version" ]; then
        echo "No version selected. Exiting."
        exit 1
    fi
else
    version=$1
    # Validate version argument
    if [[ ! "$version" =~ ^(patch|minor|major)$ ]]; then
        echo "Error: version must be one of: patch, minor, major"
        echo "Usage: ./scripts/bump.sh <patch|minor|major>"
        echo "Or run without arguments for interactive selection"
        exit 1
    fi
fi

# Build first, if failed, exit
pnpm --filter @typo/desktop run build:frontend || exit 1

# Update root package.json version, without tag
pnpm version $version --no-git-tag-version
package_version=$(jq -r '.version' package.json)
# Sync apps/**/package.json "version" to match root (same release line)
while IFS= read -r -d '' pkg; do
    perl -i -pe "s/\"version\": \"[^\"]*\"/\"version\": \"$package_version\"/" "$pkg"
done < <(find apps packages -name package.json -print0)
echo "package.json version: $package_version"

# Update src-tauri version
cd apps/desktop/src-tauri
# Update Cargo.toml version
perl -i -pe "s/^version = \".*\"/version = \"$package_version\"/g" Cargo.toml
# Update Cargo.lock version
cargo update --package typo --precise $package_version

# Tag notes
last_tag=$(git tag --sort=version:refname | tail -n 1)
notes=$(git log --pretty="%s" $last_tag..HEAD)

# Return to workspace root for node script
cd ../../../

echo "Generating AI release notes..."
pnpm releases:gen "$package_version" || echo "Warning: AI notes generation failed, proceeding with standard bump."

release_file="packages/releases/data/v${package_version}.json"
if [ ! -f "$release_file" ]; then
    echo "Error: $release_file not found. Fix release notes generation before continuing."
    exit 1
fi

gum style --bold "Review release notes"
echo "Opening $release_file in ${EDITOR:-vim}. Save and quit (:wq) to continue."
"${EDITOR:-vim}" "$release_file"

git add -A
git commit --message "🚀 [releases]: v$package_version"

git tag v$package_version -m "$notes"

if gum confirm "Push changes and tag to origin?"; then
    git push origin
    git push origin v$package_version

    echo ""
    gum style \
        --border double \
        --margin "1 2" \
        --padding "0 1" \
        --border-foreground 212 \
        "Wait for CI to create the release, then publish it at:" \
        "https://github.com/yuler/typo/releases"
    echo ""
else
    echo "Push aborted. You can push manually later."
fi
