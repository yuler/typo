#!/usr/bin/env bash

HOST=app.typo.yuler.cc
USER=root

DOCKER_CONTAINER_NAME=typo-web

# Convert underscores to hyphens for matching (container names use hyphens)
CONTAINER_PREFIX=$(echo "$DOCKER_CONTAINER_NAME" | tr '_' '-')

# SSH to server and find matching container
# Match container names that start with the prefix
CONTAINER_ID=$(ssh "$USER@$HOST" "docker ps --format '{{.ID}}\t{{.Names}}' | awk -F'\t' -v prefix=\"${CONTAINER_PREFIX}\" '\$2 ~ \"^\" prefix || \$2 ~ \",\" prefix {print \$1; exit}'")

if [ -z "$CONTAINER_ID" ]; then
  echo "Error: No container found matching prefix '$CONTAINER_PREFIX'"
  echo "Available containers:"
  ssh "$USER@$HOST" "docker ps --format '{{.Names}}'"
  exit 1
fi

echo "Found container: $CONTAINER_ID"
echo "Connecting to container..."

# Connect to container
ssh -t "$USER@$HOST" "docker exec -it $CONTAINER_ID ./bin/rails console"
