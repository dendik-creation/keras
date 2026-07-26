<div align="center">
  <img src="public/logo.png" alt="KeRaS logo" width="120" />

  # KeRaS

  **Membantu Menyiapkan Jadwalmu** — a tool that helps university students build and submit their course schedule (KRS) without the usual drama.

  ![KeRaS preview](public/og-image.png)
</div>

## Table of Contents

- [What is KeRaS?](#what-is-keras)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Run Locally](#run-locally)
- [Self-Hosting with Docker](#self-hosting-with-docker)
  - [1. Basic Setup (no link-shortening)](#1-basic-setup-no-link-shortening)
  - [2. Adding Shlink (for Share Schedule)](#2-adding-shlink-for-share-schedule)
  - [3. Production Deploy (prebuilt image from GHCR)](#3-production-deploy-prebuilt-image-from-ghcr)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Getting Help](#getting-help)

## What is KeRaS?

If you've ever dealt with a clunky, slow, or confusing KRS (Kartu Rencana Studi) system, KeRaS exists to make that process simple. It connects to your university's official KRS system, gives you one clean dashboard to plan your schedule, and lets you submit it with a single click — no personal data stored, ever.

## Features

| Feature | What it does |
|---|---|
| **Unified View** | See every available course schedule in one dashboard — no tab-switching between pages. |
| **Perang Submit** | Automatically and rapidly resubmits your KRS selections to improve your odds of landing the classes you want. *Success rate still depends on your university's own system performance.* |
| **Generate Schedule with AI** | Describe your preferences (target SKS, preferred days/hours, courses or lecturers to avoid, optimization goal) and an OpenAI-compatible model builds a conflict-free schedule, validated against every hard constraint before it's shown to you. |
| **Share & Adopt Schedule** | Share a prepared schedule with a friend via a short link (`/share-schedule/<code>`, powered by [Shlink](https://shlink.io)). The recipient's link matches the shared courses against the current offering and lets them adopt it in one tap — no raw URLs or internal Shlink domain ever exposed. |
| **Zero Database** | KeRaS stores none of your personal data. Everything is processed temporarily. |
| **Realtime Scraping** | Course data is fetched live from your university's official website, so it's always accurate. |
| **Anonymous Analytics** | Usage stats are collected via [PostHog](https://posthog.com). Your NIM is always masked (e.g. `202451***`) — no raw identity or personal data is ever sent. |
| **Server-side Bridging** | Your session acts as a secure bridge between KeRaS and your university's KRS entry system. |

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router) + React 19, TypeScript
- **Styling/UI:** Tailwind CSS 4, Radix UI, GSAP + Motion for animation
- **Forms/Validation:** React Hook Form + Zod
- **Scraping:** Axios + Cheerio (fetches live data from your university's KRS system)
- **Analytics:** PostHog (anonymous, NIM-masked)
- **AI:** any OpenAI-compatible endpoint (used for schedule generation)
- **Link Shortening:** Shlink (used for schedule sharing)
- **Runtime/Package Manager:** [Bun](https://bun.sh)
- **Desktop build:** Electron (optional, via `electron-builder`)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- Access to your university's KRS endpoint URLs (`KRS_*` env vars)

### Environment Variables

Copy `.env.example` to `.env` and fill in the values. The only required group is `KRS_*` — everything else is optional and the app degrades gracefully if unset.

```bash
# Analytics — omit NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN to disable tracking
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN="phc_xxx"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# "Generate Schedule with AI" — omit AI_API_KEY to disable the feature
AI_API_KEY=""
AI_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-4o-mini"

# Share Schedule — required only if you want short-link sharing (see below)
SHLINK_BASE_URL="http://localhost:8080"
SHLINK_API_KEY=""
APP_URL="http://localhost:3000"
```

### Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/dendik-creation/keras.git
cd keras

# 2. Install dependencies
bun install

# 3. Configure .env (see above), then start the dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) once it's running.

## Self-Hosting with Docker

KeRaS ships with:

- A `Dockerfile` (multi-stage, Bun + Next.js standalone output)
- `docker-compose.yml` — for **building locally** from source
- `docker-compose.prod.yml` — for **pulling the prebuilt image** published by [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) to GHCR (`ghcr.io/dendik-creation/keras`) on every push to `dev`/`main` or tag

Pick the one that fits:

| Scenario | Use |
|---|---|
| Dev machine, custom patches | `docker-compose.yml` — requires a full repo clone with `Dockerfile` present |
| Production VPS | `docker-compose.prod.yml` — only pulls the image, no clone or `Dockerfile` needed |

> **Common pitfall:** running plain `docker compose up -d` on a VPS that only has `docker-compose.prod.yml` (or a checkout missing `Dockerfile`) makes Compose fall back to `docker-compose.yml`'s `build:` step and fail with:
> ```
> failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
> ```
> Always pass `-f docker-compose.prod.yml` explicitly, or rename the file to `docker-compose.yml` on the VPS.

### 1. Basic Setup (no link-shortening)

```bash
# Create the shared network once
docker network create apps
```

1. Copy `.env.example` to `.env` and fill in your `KRS_*` URLs (PostHog/AI vars are optional).
2. Build and run:
   ```bash
   docker compose up -d --build
   ```
3. Open [http://localhost:3000](http://localhost:3000).

**Changing the port:** set `PORT` in your `.env` (e.g. `PORT=8080`). Compose maps and runs the app on that port.

### 2. Adding Shlink (for Share Schedule)

Share Schedule needs a [Shlink](https://shlink.io) instance reachable from the `keras` container. Shlink is **internal-only** — its domain/URL is never shown to users. KeRaS always presents `https://<your-domain>/share-schedule/<code>` and resolves it server-side.

Add a `shlink` service to your compose stack, on the same `apps` network:

```yaml
services:
  shlink:
    image: shlinkio/shlink:stable
    container_name: shlink
    restart: unless-stopped
    environment:
      DEFAULT_DOMAIN: share.yourdomain.internal   # never exposed to end users
      IS_HTTPS_ENABLED: "false"                   # internal traffic only
      DB_DRIVER: sqlite                           # no external DB needed
    volumes:
      - shlink_data:/etc/shlink/data
    networks:
      - apps

volumes:
  shlink_data:

networks:
  apps:
    external: true
```

Generate an API key once the container is up:

```bash
docker exec -it shlink shlink api-key:generate
```

Set in `.env` (already wired into `docker-compose.yml` for the `keras` service):

```bash
SHLINK_BASE_URL="http://shlink:8080"   # internal Docker hostname, not public
SHLINK_API_KEY="<generated-key>"
APP_URL="https://keras.yourdomain.com" # KeRaS's own public origin — used to build/validate share links
```

Restart the `keras` container (`docker compose up -d`) to pick up the new values — no rebuild needed, these are read at runtime.

**Notes:**
- `NEXT_PUBLIC_*` values are inlined at **build time** — rebuild (`--build`) after changing them.
- `KRS_*`, `AI_*`, `SHLINK_*`, `APP_URL` and other server-side vars are read at **runtime** from `.env`, so no rebuild is needed when they change.
- No database is required for KeRaS itself. Only Shlink (optional, SQLite) persists any state, and it holds nothing but long-URL ↔ short-code mappings.

### 3. Production Deploy (prebuilt image from GHCR)

Skip building entirely and pull the image [`docker-publish.yml`](.github/workflows/docker-publish.yml) already built and pushed to GHCR.

1. Copy just `docker-compose.prod.yml` and your `.env` to the server (no repo clone, no `Dockerfile` required):
   ```yaml
   services:
     keras:
       container_name: keras
       image: ghcr.io/dendik-creation/keras:${IMAGE_TAG:-latest}
       pull_policy: always
       ports:
         - "${PORT:-3000}:${PORT:-3000}"
       environment:
         - PORT=${PORT:-3000}
         - HOSTNAME=0.0.0.0
       env_file:
         - .env
       restart: unless-stopped
   ```
2. Set `KRS_*` (and optionally `SHLINK_*`, `AI_*`, `APP_URL`, `PORT`) in `.env`. Pin a specific build with `IMAGE_TAG` (e.g. `IMAGE_TAG=sha-abc1234`) — defaults to `latest`.
3. Pull and start:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
   `pull_policy: always` means a plain `up -d` re-pulls `latest` on every run — there's no `--build` flag here since there's nothing to build.
4. To upgrade later:
   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

> This compose file has no `apps` network or Shlink wiring. If you need Share Schedule behind the same reverse-proxy network as in step 2, add `networks: [apps]` (external) to the `keras` service and point `SHLINK_BASE_URL` at your Shlink container.

## Roadmap

- [x] Login architecture
- [x] Session management for university KRS system access
- [x] Simple scheduling view for selecting courses
- [x] "Perang KRS" rapid-submission feature
- [x] No permanent data storage
- [x] Real-time data scraping from university website
- [x] Anonymous usage analytics via PostHog
- [x] Responsive design for mobile (Landing & Dashboard pages: `/schedule`, `/submit`)
- [x] PWA support (installable, 192/512 + maskable + Apple touch icons)
- [x] Docker Compose support for self-hosting (default port 3000, configurable)
- [x] Cloudflare Turnstile challenge on login
- [x] Questionnaire gate before dashboard access
- [x] Generate Schedule with AI (constrained-optimization, OpenAI-compatible)
- [x] Share & adopt schedule via short link (Shlink-backed)

## Contributing

Contributions are welcome. Open an issue or submit a pull request on [GitHub](https://github.com/dendik-creation/keras/).

## Getting Help

Found a bug or have a question? Open an issue on the [GitHub repository](https://github.com/dendik-creation/keras/issues).
