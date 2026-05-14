# Project Sentinel — Deployment Guide

## Environment Variables

### Local Development
Copy `.env.example` to `.env.local` at the repo root:
```bash
cp .env.example .env.local
```
Fill in your `ANTHROPIC_API_KEY`. Leave `TURSO_*` blank — the app uses a local
SQLite file (`monitoring/sentinel.db`) automatically.

### Vercel (Production)

You must add these variables in the **Vercel Dashboard**:
> Project → Settings → Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | Anthropic API key from console.anthropic.com |
| `TURSO_DATABASE_URL` | ✅ Yes | `libsql://<db>-<org>.turso.io` |
| `TURSO_AUTH_TOKEN` | ✅ Yes | Token from `turso db tokens create <db>` |

> **Do NOT** use the old `@secret-name` syntax in `vercel.json`. Variables must
> be added through the Vercel dashboard or `vercel env add`.

### GitHub Actions Secrets
Add these in **GitHub → Repo → Settings → Secrets and Variables → Actions**:

| Secret | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Same as above |
| `TURSO_DATABASE_URL` | Same as above |
| `TURSO_AUTH_TOKEN` | Same as above |
| `VERCEL_TOKEN` | Personal token from vercel.com/account/tokens |
| `VERCEL_ORG_ID` | From Vercel project settings → Team ID |
| `VERCEL_PROJECT_ID` | From Vercel project settings → Project ID |

## Turso Setup (5 minutes)

```bash
# 1. Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 2. Login
turso auth login

# 3. Create database
turso db create sentinel-db

# 4. Get your URL (paste into Vercel/GitHub secrets)
turso db show sentinel-db --url

# 5. Create an auth token (paste into Vercel/GitHub secrets)
turso db tokens create sentinel-db
```

## First Deploy

```bash
# 1. Initialize the remote Turso schema
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=eyJ... pnpm monitor:init

# 2. Deploy via Vercel CLI
vercel --prod
```

## Fresh Clone Verification

```bash
git clone <repo>
cd sentinel
pnpm install
pnpm chaos:dry          # Verify chaos monkey works (no writes)
pnpm monitor:init       # Creates local sentinel.db
pnpm monitor:status     # Should show 3 HEALTHY services
pnpm dev                # Dashboard at http://localhost:3000
```
