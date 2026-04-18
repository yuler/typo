#! /usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
else
  echo "Missing $ROOT/.env — set WWW_SERVER_HOST, WWW_SERVER_HOST_USERNAME, WWW_SERVER_HOST_PASSWORD, WWW_SERVER_HOST_TARGET" >&2
  exit 1
fi

DIST="${ROOT}/apps/www/dist"
if [[ ! -d "$DIST" ]]; then
  echo "Missing $DIST — run pnpm www:build first" >&2
  exit 1
fi

sshpass -p "${WWW_SERVER_HOST_PASSWORD}" scp -r "${DIST}"/* "${WWW_SERVER_HOST_USERNAME}@${WWW_SERVER_HOST}:${WWW_SERVER_HOST_TARGET}"
