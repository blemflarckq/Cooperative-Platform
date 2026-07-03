#!/bin/sh
set -e

echo "⏳ Waiting for Database at ${POSTGRES_HOST}:${POSTGRES_PORT}..."

# Use /dev/tcp (if using bash) or nc (netcat, usually built-in)
# This loop waits until it can connect to the port
while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  echo "Postgres port is closed - sleeping"
  sleep 2
done

echo "✅ Postgres port is open!"

# Since your seed is likely in the dist folder as an 'asset'
if [ -f "/app/dist/apps/${TARGET_APP}/seed/seed.ts" ]; then
    echo "🌱 Running Seed..."
    #node dist/apps/${TARGET_APP}/src/seed/seed.js
    npx ts-node /app/dist/apps/${TARGET_APP}/seed/seed.ts
fi

echo "🚀 Starting ${TARGET_APP}..."
exec node dist/apps/${TARGET_APP}/main.js