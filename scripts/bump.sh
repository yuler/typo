#!/bin/bash

version=$1

# Validate version argument
if [[ ! "$version" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: version must be one of: patch, minor, major"
  echo "Usage: ./scripts/bump.sh <patch|minor|major>"
  exit 1
fi

# Update package.json version, without tag
pnpm version $version --no-git-tag-version
package_version=$(cat package.json | jq -r '.version')

echo "package.json version: $package_version"

# Update src-tauri version
cd src-tauri
# Update Cargo.toml version
sed -i "s/^version = \".*\"/version = \"$package_version\"/g" Cargo.toml
# Update Cargo.lock version
cargo update --package typo --precise $package_version

git add -A
git commit --message "Release v$package_version"

git tag v$package_version
git push origin
git push origin v$package_version
