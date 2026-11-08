# TODO — Family Weekend Planner

Ordered by priority for the two-hour window. Working, honest output comes
before polish, and polish comes before extras.

## P0 — Working end to end
- [ ] Scaffold: Vite + TS frontend, Node + TS API in `server/`, `.env.example`, `.gitignore`
- [ ] `GET /api/cities?q=` → Open-Meteo geocoding (name, admin1, country, lat/lon, timezone)
- [ ] Weekend date logic in city timezone + unit tests (Mon–Fri, Sat, Sun cases)
- [ ] `GET /api/plan?lat&lon&tz` → weather (Sat/Sun) + 2 kid activities + 1 Italian restaurant, each with `source`, `retrievedAt`, `status`
- [ ] Explicit "unavailable" / "couldn't verify" states per section
- [ ] UI: search with disambiguated results, plan view with three sections

## P1 — Deploy
- [ ] Server: non-root user, Node LTS, nginx on 80 → `127.0.0.1:3000`, `ufw` (OpenSSH + 80)
- [ ] `systemd` unit (auto-restart, survives logout); verify after SSH disconnect

## P2 — Polish (25% of the score)
- [ ] Cohesive type, color, and spacing; weather icons; responsive layout
- [ ] Loading skeletons, empty states, error states
- [ ] Weather-aware activity choice (rain → indoor)

## P3 — Handoff
- [ ] `README.md`, `VERIFICATION.md`, `AI-USAGE.md`
- [ ] Run the four required verification cases and record the results
