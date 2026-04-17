#!/bin/bash

# Function to display radio-style selection
select_version() {
    echo "Select version type:"
    echo "1) patch (default)"
    echo "2) minor" 
    echo "3) major"
    echo ""
    
    read -p "Enter your choice (1-3), default is patch: " choice
    case $choice in
        2) version="minor" ;;
        3) version="major" ;;
        *) version="patch" ;;
    esac
}

# Check if version argument is provided
if [ -z "$1" ]; then
    select_version
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
done < <(find apps -name package.json -print0)
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

git add -A
git commit --message "🚀 Release v$package_version"

git tag v$package_version -m "$notes"
git push origin
git push origin v$package_version

echo ""
echo "Wait for CI to create the draft release, then publish it at:"
echo "https://github.com/yuler/typo/releases"
echo ""
