#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
ENV_FILE="${REPO_ROOT}/packages/arrivo-server/.env"

if [ ! -f "${ENV_FILE}" ]; then
  echo "找不到 ${ENV_FILE}" >&2
  exit 1
fi

DATABASE_URL="$(
  node -e 'const fs = require("fs"); const text = fs.readFileSync(process.argv[1], "utf8"); const line = text.split(/\n/).find((item) => item.startsWith("DATABASE_URL=")); if (!line) process.exit(1); process.stdout.write(line.slice("DATABASE_URL=".length).replace(/^['\''"]|['\''"]$/g, ""));' "${ENV_FILE}"
)"

HOST="$(
  node -e 'const url = new URL(process.argv[1]); process.stdout.write(url.hostname);' "${DATABASE_URL}"
)"

PORT="$(
  node -e 'const url = new URL(process.argv[1]); process.stdout.write(url.port || "5432");' "${DATABASE_URL}"
)"

echo "检查 TCP: ${HOST}:${PORT}"
nc -G 8 -vz "${HOST}" "${PORT}"

echo "检查 PostgreSQL: select 1"
psql "${DATABASE_URL}" -c "select 1 as ok;"
