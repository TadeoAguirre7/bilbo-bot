#!/bin/sh
set -e

echo "Checking environment variables..."
[ -n "$BOT_TOKEN" ] && echo "BOT_TOKEN: OK" || echo "BOT_TOKEN: MISSING"
[ -n "$ZEN_API_KEY" ] && echo "ZEN_API_KEY: OK" || echo "ZEN_API_KEY: MISSING"
[ -n "$NOTION_TOKEN" ] && echo "NOTION_TOKEN: OK" || echo "NOTION_TOKEN: MISSING"
[ -n "$NOTION_DATABASE_ID" ] && echo "NOTION_DATABASE_ID: OK" || echo "NOTION_DATABASE_ID: MISSING"
[ -n "$DEFAULT_MODEL" ] && echo "DEFAULT_MODEL: OK" || echo "DEFAULT_MODEL: MISSING"
[ -n "$MAX_HISTORY" ] && echo "MAX_HISTORY: OK" || echo "MAX_HISTORY: MISSING"

echo "Starting Bilbo..."
exec npm start
