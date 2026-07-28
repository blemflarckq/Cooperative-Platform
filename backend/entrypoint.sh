#!/bin/sh
set -e

echo "Waiting for database at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  echo "Postgres port is closed - sleeping"
  sleep 2
done
echo "Postgres is reachable."

# Resolve the actual main.js path for the target app. TypeScript's build
# output shape currently differs between apps (api's cross-app imports from
# worker cause a deeper nested output for worker) — this checks both known
# locations rather than assuming one.
if [ -f "/app/dist/${TARGET_APP}/src/main.js" ]; then
  MAIN_JS="/app/dist/${TARGET_APP}/src/main.js"
elif [ -f "/app/dist/main.js" ]; then
  MAIN_JS="/app/dist/main.js"
else
  echo "Could not find main.js for ${TARGET_APP} in expected locations." >&2
  exit 1
fi

echo "Starting ${TARGET_APP} (${MAIN_JS})..."
exec node "$MAIN_JS"
