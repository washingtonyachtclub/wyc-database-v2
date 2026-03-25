#!/bin/bash
# Usage: source use-env.sh dev|prod-readonly|prod-write
# Copies the matching .env file to .env.local and reminds you to restart the dev server.

if [ -z "$1" ]; then
  echo "Usage: source use-env.sh dev|prod-readonly|prod-write"
  return 1 2>/dev/null || exit 1
fi

case "$1" in
  dev|prod-readonly|prod-write) ;;
  *)
    echo "Error: invalid environment '$1'"
    echo "Usage: source use-env.sh dev|prod-readonly|prod-write"
    return 1 2>/dev/null || exit 1
    ;;
esac

ENV_FILE=".env.$1"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  return 1 2>/dev/null || exit 1
fi

cp "$ENV_FILE" .env.local
echo "Switched to $1 environment. Restart your dev server."
