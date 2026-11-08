# TODO — Family Weekend Planner

## P0 — Working end to end

- [x] Scaffold: Vite + TS frontend (Spectre), Node + TS API in `server/`,
      `.env.example`
- [x] `/api/geocode` → Open-Meteo geocoding (name, admin1, country, timezone)
- [x] Weekend date logic in the city's timezone, plus unit tests
- [x] `/api/weekend`, `/api/activities`, `/api/restaurant`, each with source and
      `retrievedAt`
- [x] Explicit unavailable and couldn't-verify states per section
- [x] UI: disambiguated search; plan view with three sections

## P1 — Deploy

- [x] `deploy/family-weekend.service`, `deploy/nginx.conf`, `deploy.sh`
- [x] Server: `app` user, Node 24, nginx, ufw (OpenSSH first, then 80). Steps in
      README
- [x] Verify the app survives SSH logout and a reboot

## P2 — Polish

- [x] Cohesive tokens, inline SVG icons, responsive layout (checked at 1366
      and 390)
- [x] Skeletons, empty states, error states with retry
- [x] Weather-aware activity ranking with Indoor/Outdoor filters

## P3 — Handoff

- [x] `README.md`, `VERIFICATION.md`, `AI-USAGE.md` (drafts)
- [x] Re-run the verification checklist on the server and record the server URL
- [x] Add your own corrections and decisions to `AI-USAGE.md`
