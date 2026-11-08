# Family Weekend Planner

Plan a family weekend in any city: Saturday and Sunday weather, two activities
for children aged 4–8 (weather-aware), and one Italian restaurant. Everything
comes from live, linked, timestamped public sources, and the app says so plainly
when something can't be verified.

**Live:** URL supplied separately with the assessment submission.

Try `Portland` (shared name), `Toronto`, or add `?simulateFail=overpass` to see
the failure states.

**Stack:** TypeScript · Vite SPA (Spectre shell, components, and tokens) · Node
24 + Express 5 API (run directly from TypeScript via Node's type stripping) ·
nginx · systemd · Ubuntu.

## How it works

```
Browser ──► nginx :80 ──► Node/Express 127.0.0.1:3000
                            ├── /api/geocode     → Open-Meteo Geocoding
                            ├── /api/weekend     → Open-Meteo Forecast
                            ├── /api/activities  → OpenStreetMap (Overpass)
                            ├── /api/restaurant  → OpenStreetMap (Overpass)
                            └── /*               → dist/ (built SPA)
```

- The browser only talks to `/api/*`. All third-party calls happen on the
  server, with timeouts, an in-memory TTL cache, and a `retrievedAt` timestamp
  on every response. Cached responses keep their original fetch time.
- **Weekend dates** use the city's IANA timezone: Saturday → today and tomorrow;
  Sunday → the following Saturday and Sunday; weekdays → the upcoming weekend.
- **Activities**: named OSM places (zoos, aquariums, children's, science, and
  natural-history museums, planetariums, indoor play, water and theme parks,
  libraries, playgrounds, parks), scored by category, notability (wiki/website),
  and distance. When rain is likely, indoor places get a boost. The UI picks the
  top two from different categories, and Indoor/Outdoor filters re-rank them
  instantly.
- **Restaurant**: OSM `amenity=restaurant` with `cuisine~italian`, ranked by
  listing completeness, family tags (high chairs, kids' area), and distance. If
  none is found, the UI says it couldn't verify one instead of guessing.
- **Failure demo**: add `?simulateFail=geocode|weather|overpass` to the page URL
  (or to an API call) to force that source to fail.

## Data sources (all free, no API keys)

| Source                     | Used for                                                | Link                                         |
| -------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| Open-Meteo Geocoding       | City search (name, region, country, timezone)           | https://open-meteo.com/en/docs/geocoding-api |
| Open-Meteo Forecast        | Weekend weather (WMO codes, °C, mm, %)                  | https://open-meteo.com/                      |
| OpenStreetMap via Overpass | Activities and restaurant (each linked to its OSM page) | https://www.openstreetmap.org/copyright      |

Overpass mirrors, tried in this order with hedged starts: overpass-api.de,
overpass.private.coffee, maps.mail.ru.

## Local development

```bash
npm install
npm run dev:api     # API on 127.0.0.1:3000 (auto-restart on change)
npm run dev         # Vite on :5173, proxies /api to the API
npm run check       # format + lint + typecheck + tests + build + manifest
npm run build && npm start   # production mode: serves dist/ + API on :3000
```

Configuration: see `.env.example` (`HOST`, `PORT`). No secrets are required.

## Server install (Ubuntu, run once as root)

```bash
# 1. Node 24 + nginx
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs nginx

# 2. Firewall: allow SSH BEFORE enabling, so Ashlex's access is never lost.
#    Reject (not drop) 443 so HTTPS-first browsers fall back to HTTP at once.
ufw allow OpenSSH && ufw allow 'Nginx HTTP' && ufw reject 443/tcp && ufw --force enable

# 3. Unprivileged service user; the app user owns the checkout and builds it
useradd --system --create-home --shell /usr/sbin/nologin app
mkdir -p /opt/family-weekend && chown app:app /opt/family-weekend
sudo -u app git clone https://github.com/bradpotts/ashlex-family-planner /opt/family-weekend
cd /opt/family-weekend && sudo -u app npm ci && sudo -u app npm run build

# 4. systemd service
cp deploy/family-weekend.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now family-weekend

# 5. nginx
cp deploy/nginx.conf /etc/nginx/sites-available/family-weekend
ln -sf /etc/nginx/sites-available/family-weekend /etc/nginx/sites-enabled/family-weekend
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Root credentials, `sshd_config`, and SSH keys are left untouched.

### Start / stop / restart / logs

```bash
systemctl status family-weekend
systemctl restart family-weekend
journalctl -u family-weekend -f
```

### Redeploy after code changes

Run `deploy.sh` as root on the server:

```bash
sudo bash /opt/family-weekend/deploy.sh
```

It runs `git pull`, `npm ci`, and `npm run build` as the `app` user, restarts
the service, and prints `/api/health` through nginx.

### Why it survives logout

The app runs as a systemd service (`Restart=always`,
`WantedBy=multi-user.target`), not in the SSH session, so it keeps running after
logout and starts again on reboot.

### Security basics

- Node binds to `127.0.0.1:3000` only; nginx on :80 is the only public service
  besides SSH.
- ufw allows **OpenSSH** and **Nginx HTTP** only. Port 443 is **rejected**
  rather than dropped, so HTTPS-first browsers (Chrome) get an immediate refusal
  and fall back to HTTP instead of hanging until a timeout.
- No TLS: no hostname was supplied, so there is no certificate to issue.
- Runs as the unprivileged `app` user with systemd hardening (`NoNewPrivileges`,
  `ProtectSystem=strict`, `PrivateTmp`, no capabilities).
- `x-powered-by` is off and `server_tokens` is off. Security headers are set:
  CSP, `nosniff`, frame `DENY`, Referrer-Policy.
- Inputs are validated (query 2–80 chars, lat/lon ranges, IANA timezone).
- All OSM text is escaped before rendering; only http(s) links are rendered.
- No secrets exist; `.env` is git-ignored.

## Main technical decisions

- **Keyless public data (Open-Meteo + OSM)** over Google Places and similar: no
  cost, no secrets, and every place has a public, verifiable source link. The
  trade-off: OSM coverage and freshness vary by city.
- **Server-side proxy** keeps third-party logic, caching, and failure handling
  in one place, and leaves nothing sensitive in the browser.
- **One Overpass query per city**, shared by the activities and restaurant
  routes, with **hedged mirrors** (the primary starts at once; backups start 2s
  apart; first success wins), because public Overpass latency swung between 1s
  and 35s during development.
- **IPv4 first for outbound calls**: the server's IPv6 route to Overpass stalled
  (~31s per query), while IPv4 is fast, so the Node DNS order is `ipv4first`.
- **Deploy by `git pull` on the server, not CI/CD**: a time and security
  trade-off for a two-hour build, with no deploy keys or server credentials
  stored in GitHub.
- **Weather-aware ranking** reuses the cached forecast. If weather fails,
  activities are still ranked, and the UI says so.
- **Suitability text is per category**, not invented per place. The UI states
  that suitability is inferred from the place type.

## Known limitations / unfinished

- **Slow public Overpass**: the public Overpass servers can take 15–35s per
  query, so the first search for a city can be slow. Mitigations: IPv4-first
  outbound connections, one combined query per city shared by both routes,
  hedged mirrors, a 55s timeout, and an honest loading hint. Failures show an
  error with "Try again". With more time: self-host an Overpass extract, or
  pre-warm popular cities.
- **In-memory cache clears on restart**: results are cached per process (weather
  30 min, places 6 h, geocoding 24 h), so repeat searches are instant, but every
  restart or deploy starts cold. Redis or SQLite would fix that.
- **No HTTPS**: no hostname was supplied, so there's no TLS certificate. Port
  443 is rejected so browsers fall back to HTTP quickly. With a domain, add
  certbot.
- **No date picker**: the brief fixes which weekend to plan, so choosing other
  weekends was deliberately left out.
- **No CI deploy**: CI runs the checks; deploys are `deploy.sh` run on the
  server.
- OSM data quality varies. Opening hours are shown as "per OpenStreetMap, may be
  outdated", and age suitability is inferred from the category.
- Temperatures are shown in °C only (no unit toggle).
- No end-to-end test suite; the UI was verified manually with a headless browser
  (see `VERIFICATION.md`).
