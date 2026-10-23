#!/usr/bin/env bash
# UNiCOM Console — Vercel build step.
# SQLite is the dev/sandbox database; serverless production uses Neon Postgres.
# When DATABASE_URL is a postgres URL (set in Vercel project env), swap the
# Prisma provider for the serverless build. Local sqlite builds are untouched.
set -euo pipefail

if [ -n "${DATABASE_URL:-}" ] && [[ "${DATABASE_URL}" == postgres* ]]; then
  echo "vercel-build: switching Prisma provider to postgresql for serverless"
  sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
  rm -f prisma/schema.prisma.bak
fi

bun install
bun run db:generate
bun x next build
