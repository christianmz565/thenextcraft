#!/usr/bin/env bash
set -euo pipefail

docker compose --env-file .env.dev -f docker-compose.dev.yml exec backend ./generate_admin_key.sh
