# CLAUDE.md — Family Weekend Planner

Read [AGENTS.md](AGENTS.md) first. It defines the shared rules, workflow,
validation, server boundaries, and authority model. Product scope is in
[SPEC.md](SPEC.md).

## Project Identity

- Product: Family Weekend Planner, a two-hour timed assessment for Ashlex
- Owner: Bradley Potts. Developer: PHCDevworks
- Primary implementation agent: Claude Code
- AI use is encouraged by the assessor and must be disclosed in `AI-USAGE.md`

## Entry Point

1. Read `AGENTS.md`, then this file.
2. Check `TODO.md` for the current priority and `SPEC.md` for the requirement.
3. Inspect the relevant module fully before editing.

## Time-Boxed TODO Workflow

1. Work in TODO priority order: P0 (works end to end) → P1 (deployed) →
   P2 (polish) → P3 (handoff docs).
2. Tick an item only after its behavior is verified and `npm run check` passes.
3. If something is cut for time, leave it unticked and add it to README
   "Known limitations / unfinished".
4. After meaningful steps, append a short redacted entry to `AI-USAGE.md`
   (prompt summary, what was produced, how it was verified, any correction).

## Scope

Claude Code owns:

- `src/` frontend, `server/` API, `deploy/` configs, tests, and tooling
- drafting `README.md`, `VERIFICATION.md`, and `AI-USAGE.md`
- `SPEC.md` upkeep (Bradley Potts approves scope changes)

Claude Code does not own:

- any git command in this repository
- running root-level commands on the Linode without Bradley Potts's go-ahead
- SSH, root credential, or firewall changes beyond SPEC §6

## Git Access — Denied

Claude Code has zero git access in this repository (enforced in
`.claude/settings.json`). Do not run any git command. Stop after validation and
hand off to Codex or Bradley Potts.

## The Rule That Overrides Everything

Never present an invented fact as verified. Every forecast, activity, and
restaurant is sourced, linked, and timestamped, or the UI clearly says it is
unavailable.

## Implementation Rules

- Weekend calculation: derive the city's local date from its IANA timezone
  (`Intl.DateTimeFormat` with `timeZone`), then find the next Saturday on or
  after that date; on Sunday, use +6 and +7 days. Cover Mon, Fri, Sat, and Sun,
  plus a timezone-crossing case, in unit tests.
- Weather: request Open-Meteo `daily` fields (`weather_code`,
  `temperature_2m_max/min`, `precipitation_probability_max`,
  `precipitation_sum`) with `timezone=<city tz>` and `start_date`/`end_date`
  set to the weekend. Show units from the response. If the weekend is past the
  forecast horizon, say so.
- Activities: query Overpass near the city for kid-suitable OSM tags
  (`leisure=playground|park`, `tourism=zoo|aquarium|museum|theme_park`,
  `amenity=library`, etc.). Prefer indoor options when rain probability is
  high. Pick two named places and give a one-line "why it suits ages 4–8"
  derived from the place type, not invented details.
- Restaurant: Overpass `amenity=restaurant` + `cuisine~italian|pizza`, named,
  nearest to the city centre. If none is found, return `status: "empty"` and
  show "We couldn't verify an Italian restaurant here".
- Source links: `https://www.openstreetmap.org/<node|way|relation>/<id>`; add
  the place's own `website` tag when present. Weather links to Open-Meteo.
- Set a timeout on every external call (about 8s); map failures to
  `status: "error"` with a user-safe message.
- Interpolated data goes through `textContent` or escaping, never raw
  `innerHTML`.
- Use a generic app User-Agent for OSM services. Never use personal emails.
- Comments explain why, not what.

## Development Commands

```bash
npm install
npm run dev         # Vite dev server + API (proxy /api → server)
npm run typecheck
npm test            # Vitest
npm run build
npm run check       # full gate; run before every handoff
```

## Standard Procedure

1. Confirm the task is within `AGENTS.md` boundaries.
2. Implement the smallest correct change.
3. Run `npm run check`.
4. State whether it was checked in a browser (desktop and mobile).
5. Hand off files changed, validation results, and remaining risk.
