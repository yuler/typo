#! /usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
else
  echo "Missing $ROOT/.env — set WWW_SERVER_HOST, WWW_SERVER_HOST_USERNAME, WWW_SERVER_HOST_TARGET (optional: WWW_SERVER_SSH_IDENTITY)" >&2
  exit 1
fi

DIST="${ROOT}/apps/www/dist"
if [[ ! -d "$DIST" ]]; then
  echo "Missing $DIST — run pnpm www:build first" >&2
  exit 1
fi

RSYNC_RSH=(ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new)
if [[ -n "${WWW_SERVER_SSH_IDENTITY:-}" ]]; then
  RSYNC_RSH+=(-i "$WWW_SERVER_SSH_IDENTITY")
fi

REMOTE="${WWW_SERVER_HOST_USERNAME}@${WWW_SERVER_HOST}"
# Trailing slash: sync dist/ *contents* into the remote directory.
rsync -az "${DIST}/" "${REMOTE}:${WWW_SERVER_HOST_TARGET}/" -e "${RSYNC_RSH[*]}"
