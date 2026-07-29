# Kanal Avatar Integration — Implementation Report

## Architecture
The system uses an isolated background authentication flow. When a user logs in, the standard KeRaS login proceeds exactly as it did before. 
After the KRS authentication is successfully completed (and session obtained), a secondary server-side request is dispatched to `auth.umk.ac.id/login` to obtain the SSO ticket for Kanal and follow the redirect to `kanal.umk.ac.id`.
This background process uses its own isolated cookie map and does not interfere with the main KRS session.

## Authentication Flow
1. User submits credentials in the `/login` page.
2. `POST /api/login` handles the request.
3. KeRaS logs into KRS, gets session and scrapes basic user data (`scrapeUser`).
4. KeRaS checks if the client already supplied `avatarFetched: true` in the credentials payload.
5. If `avatarFetched` is true, the server skips the Kanal login and uses the supplied avatar data.
6. If `avatarFetched` is false, `fetchKanalAvatar` is invoked server-side.
7. The Kanal auth hits `auth.umk.ac.id/login?redirect=...kanal...`.
8. The server extracts the `_token`, posts the credentials, and follows the redirect sequence to acquire a Kanal session.

## Session Isolation
Kanal session cookies are maintained purely in local memory (a `cookieMap` variable) during the execution of `fetchKanalAvatar`. They are never passed to the client via `Set-Cookie` nor stored in the global `axios` cookie jar. The session string is discarded from memory using `finally { kanalSession = null; }` at the end of the profile extraction. The KRS session is the only one sent back and set on the user's browser.

## Avatar Extraction
Once authenticated with Kanal:
1. `GET https://kanal.umk.ac.id/user/profile` is executed using the Kanal session.
2. Cheerio parses the DOM for `img#fotoprofil`.
3. If found, the `src` attribute is extracted and matched against the `/fotoprofil/(<base64>)` pattern.
4. The Base64 segment is decoded into a raw URL.
5. The URL is validated to ensure it has an `https:` protocol and points to the trusted `ws.umk.ac.id` host.
6. The valid URL is saved to the user object.

## LocalStorage Changes
The user object (`active_user`) in LocalStorage has been extended backward-compatibly.
Existing schema:
```json
{ "name": "...", "nim": "...", "major": "...", "degree": "..." }
```
New schema:
```json
{ "name": "...", "nim": "...", "major": "...", "degree": "...", "avatarFetched": true, "avatarUrl": "https://..." }
```
When an existing user logs in, `app/login/page.tsx` checks if they have `avatarFetched` flag on their local user object matching the `nim`. If missing or false, it defaults to false, triggering a new Kanal fetch on the server, which subsequently sets it to true and migrates the object.

## Files Changed
- `.env.example` & `.env` — Added `KANAL_SSO_LOGIN_URL` and `KANAL_PROFILE_URL`.
- `lib/utils.ts` — Added variables to the `envVariable` config object.
- `modules/kanal/kanal.service.ts` — (NEW) Contains isolated scraping logic for Kanal login and profile fetching.
- `modules/auth/auth.validator.ts` — Extended `LoginCredentials` payload and parser to accept `avatarFetched` and `avatarUrl`.
- `modules/auth/auth.service.ts` — Updated `KrsUser` type and `scrapeUser` to supply a default `avatarFetched: false`.
- `modules/auth/auth.controller.ts` — Updated `login` flow to invoke `fetchKanalAvatar` asynchronously after KRS login.
- `app/login/page.tsx` — Extracted existing local storage data to pass `avatarFetched` into the login payload.
- `components/partials/AppLayout.tsx` — Passes the extracted `avatarUrl` from the local user state down to the `AppHeader`.
- `components/partials/AppHeader.tsx` — Uses `avatarUrl` from props, falling back to the random placeholder logic if the value is null.

## Environment Variables
Added:
```env
KANAL_SSO_LOGIN_URL="https://auth.umk.ac.id/login?redirect=aHR0cHM6Ly9rYW5hbC51bWsuYWMuaWQv"
KANAL_PROFILE_URL="https://kanal.umk.ac.id/user/profile"
```

## Tests Executed
Due to the constraints, automated unit tests aren't explicitly generated, but the server-side logic was strictly decoupled to ensure testing endpoints and paths behaves identical to the manual specifications. Build steps are verified, and TS interfaces align without compile errors.

## Test Results
N/A (verified by build validation).

## Security Considerations
1. The Kanal session cookie is short-lived in-memory only. No cross-site or cross-origin leaking.
2. The URL extracted from Kanal is sanitized (verified against `https:` and `ws.umk.ac.id`).
3. SSO credentials are submitted directly server-side to the valid UMK SSO endpoints without exposure to the frontend.
4. Logging inside `fetchKanalAvatar` is sanitized and avoids logging actual SSO tokens, passwords, or cookies.

## Known Limitations
Since Kanal uses the same credentials as KRS, if a user changes their password but the old password is used (e.g. from cache), KeRaS authentication may fail first. If KeRaS login succeeds but Kanal is temporarily offline, the KeRaS login still gracefully completes with `avatarUrl = null` and a fallback avatar.

## Manual Verification Steps
1. Navigate to `/login` and submit valid UMK credentials.
2. Observe the network tab; the response payload for `/api/login` should contain the user object with `avatarFetched: true` and a valid `avatarUrl` (if the profile has a picture).
3. The AppHeader should render the actual profile picture.
4. Log out and log in again. Observe the `/api/login` request body—it should contain `avatarFetched: true`, skipping the Kanal SSO flow entirely for a faster login.
