#!/bin/bash

set -euo pipefail

bun run cloudflare-typecheck
bun run api-build
bun run fe-build
bun run manage-build

echo "Cloudflare build checks passed."
