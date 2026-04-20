#!/bin/bash

# Test suite for git-diff.sh

DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$DIR/git-diff.sh"

setup_test_repo() {
    local test_dir="$1"
    rm -rf "$test_dir"
    mkdir -p "$test_dir"
    cd "$test_dir"
    git init -q
    git config user.email "test@example.com"
    git config user.name "Test User"
    echo "initial" > file.txt
    git add file.txt
    git commit -q -m "Initial commit"
}

cleanup() {
    rm -rf /tmp/git-diff-test-*
}

trap cleanup EXIT

echo "Testing git-diff.sh..."

# Test 1: Exit with status 1 when no changes are staged
echo "Test 1: No staged changes should exit with status 1"
setup_test_repo "/tmp/git-diff-test-1"
if "$SCRIPT"; then
    echo "❌ FAIL: Expected exit status 1"
    exit 1
else
    echo "✓ PASS: Exit status 1 as expected"
fi

# Test 2: Show diff when lockfile is excluded
echo "Test 2: Lockfiles should be excluded from diff"
setup_test_repo "/tmp/git-diff-test-2"
echo "change" > file.txt
echo "locked" > pnpm-lock.yaml
git add file.txt pnpm-lock.yaml
output=$("$SCRIPT")
if echo "$output" | grep -q "change" && ! echo "$output" | grep -q "locked"; then
    echo "✓ PASS: Lockfile excluded from diff"
else
    echo "❌ FAIL: Lockfile was not excluded"
    exit 1
fi

# Test 3: Show diff when changes are staged
echo "Test 3: Staged changes should appear in output"
setup_test_repo "/tmp/git-diff-test-3"
echo "new content" > file.txt
git add file.txt
output=$("$SCRIPT")
if echo "$output" | grep -q "new content"; then
    echo "✓ PASS: Staged changes shown"
else
    echo "❌ FAIL: Staged changes not shown"
    exit 1
fi

echo "All tests passed!"
