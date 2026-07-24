# KeRaS

## Introduction

KeRaS is an open-source tool designed to help university students organize and submit their course schedules (KRS) with ease. If you often struggle with managing your class schedules, KeRaS provides a simple, drama-free solution to streamline the process.

### Key Features

- **Unified View:** See all available course schedules in a single, integrated dashboard. No more switching between pages—everything you need is right in front of you.
- **Perang Submit:** The system automatically and repeatedly submits your KRS selections at high speed to increase your chances of securing your desired classes. *Note: Success rate depends on the performance of your university's official system.*
- **Generate Schedule with AI:** Describe your preferences (target SKS, preferred days/hours, courses/lecturers to avoid, optimization goal) and let an OpenAI-compatible model build a conflict-free schedule for you, validated against every hard constraint before it's shown.
- **Share & Adopt Schedule:** Share your prepared schedule with a friend via a short link (`/share-schedule/<code>`, backed by [Shlink](https://shlink.io)). Opening the link matches the shared courses against the current offering and lets the recipient adopt them in one tap — no raw/long URLs or internal Shlink domain ever exposed to users.
- **Zero Database:** KeRaS does not store any of your personal data. All information is processed temporarily to ensure your privacy and security.
- **Realtime Scrapping:** Course schedule data is fetched in real-time from your university's official website, ensuring you always get the most accurate and up-to-date information.
- **Anonymous Analytics:** KeRaS collects anonymous usage statistics via [PostHog](https://posthog.com) to understand how the tool is used. Your NIM is always masked (e.g. `202451***`), no raw identity is ever sent, and no personal data is stored on our side.
- **Server-side Bridging:** Your session acts as a secure bridge between KeRaS and your university's KRS entry system.

## Todo
- [x] Create login architecture
- [x] Manage session to access university KRS system
- [x] Simple scheduling view for selecting courses
- [x] Implement "perang krs" feature for rapid submission
- [x] Ensure no data is stored permanently
- [x] Real-time data scraping from university website
- [x] Anonymous usage analytics via PostHog
- [x] Responsive design for mobile devices <Landing & Dashboard Pages (/schedule & /submit)>
- [x] PWA support (installable, dedicated 192/512 + maskable + apple-touch icons)
- [x] Docker Compose support for self-hosting (default port 3000, configurable)
- [x] Cloudflare Turnstile challenge on login
- [x] Questionnaire gate before dashboard access
- [x] "Generate Schedule with AI" (constrained-optimization, OpenAI-compatible)
- [x] Share & adopt schedule via short link (Shlink-backed)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/dendik-creation/keras.git
   ```
2. Install dependencies:
   ```bash
   bun install
   ```
3. Configure environment variables (see `.env.example`). Notable optional groups:
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
   Every group above is optional and degrades gracefully when unset — the app runs fine with just the `KRS_*` variables.
4. Start the development server:
   ```bash
   bun run dev
   ```

## Self-Hosting with Docker

KeRaS ships with a `Dockerfile` (multi-stage, Bun + Next.js standalone) and a `docker-compose.yml`. The `keras` service expects an **external** Docker network named `apps` — this lets it sit behind a reverse proxy (e.g. Nginx Proxy Manager) and talk to sibling containers like Shlink by service name, without publishing anything except the app itself.

### 1. Basic setup (no link-shortening)

1. Create the shared network once:
   ```bash
   docker network create apps
   ```
2. Copy `.env.example` to `.env` and fill in your `KRS_*` URLs (and optionally the PostHog / AI vars).
3. Build and run:
   ```bash
   docker compose up -d --build
   ```
4. Open [http://localhost:3000](http://localhost:3000).

**Changing the port:** set `PORT` in your `.env` (e.g. `PORT=8080`). Compose maps and runs the app on that port.

### 2. Adding Shlink (for the Share Schedule feature)

Share Schedule needs a [Shlink](https://shlink.io) instance reachable from the `keras` container. Shlink is **internal-only** — its own domain/URL is never shown to users; KeRaS always presents `https://<your-domain>/share-schedule/<code>` and resolves it server-side.

Add a `shlink` service to your compose stack (own file or appended to `docker-compose.yml`), on the same `apps` network:

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

Then generate an API key once the container is up:
```bash
docker exec -it shlink shlink api-key:generate
```

Set in `.env` (used by the `keras` service, already wired in `docker-compose.yml`):
```bash
SHLINK_BASE_URL="http://shlink:8080"   # internal Docker hostname, not public
SHLINK_API_KEY="<generated-key>"
APP_URL="https://keras.yourdomain.com" # KeRaS's own public origin — used to build/validate share links
```
Restart the `keras` container (`docker compose up -d`) to pick up the new env values — no rebuild needed, these are read at runtime.

Notes:
- `NEXT_PUBLIC_*` values are inlined at **build time** — rebuild (`--build`) after changing them.
- `KRS_*`, `AI_*`, `SHLINK_*`, `APP_URL` and other server-side vars are read at **runtime** from `.env` (via `env_file`), so no rebuild is needed when they change.
- No database is required for KeRaS itself; only Shlink (optional, SQLite) persists any state, and it holds nothing but long-URL ↔ short-code mappings.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/dendik-creation/keras/).

## Any Issues?
If you encounter any issues or have questions, please feel free to open an issue on the [GitHub repository](https://github.com/dendik-creation/keras/issues). Or contact me directly at [dendik_542](https://instagram.com/dendik_542).

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=dendik-creation/keras&type=date&legend=bottom-right&sealed_token=tpfOCWqhc65easbipnRaF5VAFFvfaCv9Fr0kVNZ6rGBS2ld98s0eocvSp3SvlMseZHju2aeeNDduvbdGlmfdlFVYCsOBlB4MH92YQ7Pc930mTD7renr7kUtP5qL806t-W62qf-N3d2XptcOaxVdUoWeWqbxzm1FxVHe5tkwlWliGaG8AkK5Vbpn5OSTj)](https://www.star-history.com/?repos=dendik-creation%2Fkeras&type=date&legend=bottom-right)
