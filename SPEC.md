# SPEC.md — Family Weekend Planner

Timed technical assessment for Ashlex. Two hours total, covering planning,
server setup, development, visual design, testing, and handoff. AI tools are
encouraged, but the developer stays responsible for understanding and checking
all output.

## 1. Product

A small, polished, client-facing web app that helps a family plan a weekend in
any city in the world. It has no login, payments, or extra features.

## 2. Functional Requirements

### 2.1 City search
- Search for and select any city worldwide.
- Show **region and country** for every result, so that cities sharing a name
  (for example Portland US-OR / US-ME, or London GB / London CA-ON) can be told
  apart.

### 2.2 Target weekend (city-local time)
- Use the **selected city's** local date and time, not the server's or the
  browser's.
- The target weekend starts on the next Saturday on or after the city's local
  date:
  - Mon–Fri → the upcoming Saturday and Sunday
  - Saturday → today and tomorrow
  - Sunday → **the following** Saturday and Sunday (6 and 7 days out)
- Always display the actual dates.

### 2.3 Weekend weather
- Saturday and Sunday forecast: date, conditions, temperatures **with units**,
  and rain information (probability and/or amount) where available.
- Must come from a real weather source.

### 2.4 Two activities for children aged 4–8
- Two specific, real, local activities.
- A short explanation of why each one suits ages 4–8.
- Take the weather into account where practical (rain → indoor).
- Each activity has a source link.

### 2.5 One Italian restaurant
- One real, local Italian restaurant with its location, a short explanation,
  and a source link.
- If no suitable option can be verified, **say so clearly**. Never invent one.

## 3. Information Quality (20% of the score)

- Show when each piece of information was retrieved (a timestamp).
- Never present invented forecasts, places, opening hours, prices, or
  availability as verified facts.
- When a source fails or returns nothing, say so clearly in the UI.
- Any sample data must be visibly labelled as sample data and does not count as
  live functionality.

## 4. Appearance and UX (25% of the score)

- Cohesive design: typography, spacing, color, and visual hierarchy.
- Works on desktop and mobile.
- Weather, activities, and dining are easy to scan.
- Loading, empty, and error states for every data panel.
- Images or icons used with care. **No broken assets.**

## 5. Default Technical Approach

These are defaults, not fixed decisions. Bradley Potts may change them.

| Concern | Default |
| --- | --- |
| Frontend | TypeScript · Vite SPA (Spectre if available, otherwise hand-written CSS custom-property tokens) |
| Backend | Small Node + TypeScript API (`server/`) that proxies and normalizes every external call, so no keys or third-party logic sit in the browser |
| Geocoding | Open-Meteo Geocoding API: free, no key; returns `admin1`, `country`, `timezone` |
| Weather | Open-Meteo Forecast API (`daily`, `timezone=<city tz>`): free, no key |
| Activities / restaurant | OpenStreetMap via the Overpass API: free, no key. Source link = `https://www.openstreetmap.org/<type>/<id>`. Optionally enrich with the `website` / `wikipedia` tags |
| Weekend date math | Computed server-side from the city's IANA timezone, with unit tests |
| Process manager | `systemd` unit running as a dedicated non-root user |
| Web front | nginx on port 80 → Node bound to `127.0.0.1` only |
| Firewall | `ufw`: allow OpenSSH and 80 only |

Paid APIs (Google Places, etc.) are **out of scope** unless Ashlex agrees in
advance.

## 6. Server and Deployment Constraints

- Fresh Ubuntu Linode with root access supplied by Ashlex.
- Reachable in a browser at the server IP and port (or hostname).
- Keeps running after the SSH session ends.
- Secrets stay out of frontend code and submitted files (`.env` is git-ignored;
  `.env.example` holds placeholders only).
- Runs as a restricted user after the initial root setup.
- **Never** change the supplied root credentials, disable root SSH, or block
  port 22. Ashlex's admin access must be preserved.
- Expose only the services the app needs.
- Use only the assigned server and public or authorized data sources. Incur no
  charges.

## 7. Deliverables

1. Application URL and source code (dependency files, plus an example config
   without secrets).
2. `README.md`: install/start/restart steps, how the app survives logout,
   services, ports, APIs and data sources, main technical decisions, and known
   limitations and unfinished work.
3. `VERIFICATION.md`: checks performed, their results, and whether each was
   manual or automated. Required cases: a normal city; a city name shared by
   several places; a failed or unavailable data source; desktop and mobile
   layouts.
4. `AI-USAGE.md`: AI tools used, what they helped with, how their output was
   verified, at least one correction or decision made by the developer, and
   representative prompts (planning, design, coding, troubleshooting,
   verification) with credentials removed.

## 8. Scoring

| Area | Weight |
| --- | --- |
| Working application and correct results | 25% |
| Visual design and user experience | 25% |
| Reliable sources and handling uncertainty | 20% |
| Server setup and security basics | 15% |
| Code quality, verification, and handoff | 15% |

## 9. Time Rule

Stop at the time limit and submit what exists. Unfinished work and priority
choices go in `README.md`. The developer must be able to explain every choice,
demonstrate a failure case, and say what they would improve with more time.
