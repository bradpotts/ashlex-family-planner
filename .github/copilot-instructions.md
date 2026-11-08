# GitHub Copilot Instructions for the Family Weekend Planner

Shared rules for every agent live in [AGENTS.md](../AGENTS.md). Copilot is the
exception to this repo's no-duplication rule: suggestions are generated inline
without following links, so the hard limits are restated here on purpose.

## Hard Limits

- Never invent forecasts, places, opening hours, prices, or availability. If
  data is missing or a source fails, return `status: "empty" | "error"` and
  show it in the UI. Label any sample data **Sample data**.
- Every activity and restaurant includes a source link and a `retrievedAt`
  timestamp.
- Weekend dates use the selected city's IANA timezone. Saturday → today and
  tomorrow; Sunday → the following Saturday and Sunday.
- City results always show region and country.
- The browser calls only `/api/*`. No API keys, secrets, server IPs, or
  credentials in `src/` or any committed file.
- Free public sources only (Open-Meteo, OpenStreetMap/Overpass). No paid APIs.
- Use design tokens (CSS custom properties) rather than scattered raw values.
  No remote images that might break; use inline SVG or local assets.
- No AI co-author trailers. No pull requests unless Bradley Potts asks.

## Conventions

- TypeScript `strict` everywhere (`src/`, `server/`).
- Every external fetch has a timeout and maps failures to a user-safe message.
- Every data panel has loading, empty, and error states.
- Put data into the DOM via `textContent` or escaping, never raw `innerHTML`.

## Validation

```bash
npm run check   # typecheck + test + build
```
