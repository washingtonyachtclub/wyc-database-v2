#!/bin/bash
# Usage: source use-env.sh dev|prod
# Copies the matching .env file to .env.local and reminds you to restart the dev server.

if [ -z "$1" ]; then
  echo "Usage: source use-env.sh dev|prod"
  return 1 2>/dev/null || exit 1
fi

ENV_FILE=".env.$1"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  return 1 2>/dev/null || exit 1
fi

cp "$ENV_FILE" .env.local
echo "Switched to $1 environment. Restart your dev server."
