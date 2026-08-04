#!/bin/bash
set -e

log() { echo "[post-deploy] $(date '+%Y-%m-%d %H:%M:%S') $*"; }

# Source NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# This app reads its production secrets/URLs from a git-ignored .env that
# must already exist on the server (copy it once from .env.example and
# fill in the real DATABASE_URL / JWT_ACCESS_SECRET / JWT_REFRESH_SECRET /
# SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD). Auth here is custom JWT, not
# NextAuth, so there's no NEXTAUTH_* to set.
if [ ! -f .env ]; then
  echo "ERROR: .env is missing. Copy .env.example to .env and fill it in." >&2
  exit 1
fi

# --- Install -----------------------------------------------------------------
# Single package.json at the repo root (no workspaces) — "postinstall" also
# runs `prisma generate` automatically here.
log "Installing dependencies..."
npm ci

# --- Database ------------------------------------------------------------
log "Generating Prisma client..."
npx prisma generate

log "Applying database migrations..."
npx prisma migrate deploy

# --- Build -------------------------------------------------------------------
# `npm run build` is just `next build` here - `prisma generate` already ran
# via `postinstall` above, and migrations were already applied above too.
log "Building application..."
npm run build

# --- Reload ------------------------------------------------------------------
log "Reloading PM2 ecosystem..."
pm2 reload ecosystem.config.cjs --env production
log "Saving PM2 process list..."
pm2 save

log "Deploy complete."