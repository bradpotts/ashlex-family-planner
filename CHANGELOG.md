# Changelog

Minute-by-minute record of the Family Weekend Planner assessment, in 10-minute
blocks. Assessment window: **14:00–16:00 (local time), 8 Nov 2026**. Entries so
far run 14:00–14:55.

Times come from file modification times, screenshot timestamps, and API response
timestamps recorded during the session. Times marked `~` are estimated to within
a couple of minutes. **Who** shows whether the developer (Bradley) or the AI
agent (Claude Code) did the step. Codex (commits) and ChatGPT (prompt drafting)
are listed in `AI-USAGE.md`.

## Summary

| Block       | Focus                                                             | Outcome                                                        |
| ----------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| 14:00–14:10 | Repo setup; AI agent files copied from an earlier project         | Repo, workspace, and agent files in place                      |
| 14:10–14:20 | Agent files and spec customised for the brief; Spectre scaffold   | `SPEC.md`, `TODO.md`, agent rules; Vite + Spectre scaffold     |
| 14:20–14:30 | Backend API built and first live tests                            | Geocode and weekend routes working, with a validated date rule |
| 14:30–14:40 | Overpass (OpenStreetMap) reliability debugging                    | Root cause found; hedged mirrors; bbox queries                 |
| 14:40–14:50 | Frontend, tests, deploy files, browser verification, handoff docs | End-to-end app verified at desktop and mobile; failure demo    |
| 14:50–14:55 | Root config files (lint/format/CI) and cleanup audit              | `npm run check` green on all 6 steps                           |

## 14:00–14:10 — Setup

| Time   | Who    | Work                                                                                                                                                     |
| ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14:07  | Dev    | Created the project folder and git repo                                                                                                                  |
| 14:08  | Dev    | Added the VS Code workspace file                                                                                                                         |
| ~14:09 | Dev    | Asked Claude Code to copy the AI agent files from an earlier project (CoastOS)                                                                           |
| 14:10  | Claude | Copied `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `COPILOT.md`, `GROK.md`, `JULES.md`, `.claude/settings.json`, and Copilot instructions. Nothing overwritten |

## 14:10–14:20 — Planning and scaffold

| Time        | Who    | Work                                                                                                                                                                                          |
| ----------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~14:11      | Claude | Audited the copied files: 20 CoastOS references, so not yet project-specific                                                                                                                  |
| ~14:12      | Dev    | Pasted the Ashlex brief and asked for the files to be customised, keeping spec and context                                                                                                    |
| 14:13–14:14 | Claude | Wrote `SPEC.md` (requirements, weekend rule, information-quality rules, server limits, deliverables, scoring) and `TODO.md` (P0–P3 priorities). Rewrote all 7 agent files for this assessment |
| 14:18–14:20 | Dev    | Scaffolded the app with `spectre-init` shell-app (Vite + TS + Spectre) and ran `npm install`. Drafted the detailed build prompt with ChatGPT                                                  |

**Decisions (Dev):** keyless free data sources (Open-Meteo plus OpenStreetMap)
so there are no secrets and no costs; the own Spectre design system; nginx →
Node on localhost; systemd; a `?simulateFail=` demo hook.

## 14:20–14:30 — Backend

| Time        | Who    | Work                                                                                                                                                                                                                                                                                                                                                                             |
| ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~14:21      | Claude | Read the scaffold, `tsconfig`, the Spectre manifest, and the component type contracts (alert, card, tag, skeleton, button variants) plus the token list                                                                                                                                                                                                                          |
| 14:24       | Claude | Installed `express@5`, `@types/express`, `@types/node`                                                                                                                                                                                                                                                                                                                           |
| 14:24–14:26 | Claude | Wrote `server/lib/http.ts` (timeouts, TTL cache keeping the original `retrievedAt`, in-flight de-duplication), `weekend.ts` (city-local date rule), `weather.ts` (Open-Meteo, WMO → label and icon, wet flag), `overpass.ts`, `activities.ts` (categories, scoring, weather adjustment), `restaurant.ts`, `server/index.ts` (routes, validation, security headers, SPA fallback) |
| 14:26       | Claude | First live tests. "Portland" returned 8 places, each with region and country. Portland, OR at local Saturday 22:26 → weekend Sat 7 – Sun 8 Nov (correct). Invalid timezone → 400; `simulateFail=weather` → 503                                                                                                                                                                   |
| 14:27       | Claude | Activities and restaurant timed out after 30s. **Issue found**                                                                                                                                                                                                                                                                                                                   |

## 14:30–14:40 — Overpass debugging

| Time   | Who    | Work                                                                                                                                                                     |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ~14:29 | Claude | Probed each mirror with curl: overpass-api.de answered in 23s, private.coffee was slow, mail.ru returned 504                                                             |
| ~14:30 | Claude | Replaced sequential fallback with **hedged requests** (primary at once, backups 4s apart, first success wins)                                                            |
| 14:31  | Claude | Node `fetch` still failed while curl worked. Probe script: Node got `ETIMEDOUT` after 0.5s                                                                               |
| ~14:33 | Claude | **Root cause:** Node's 250ms happy-eyeballs per-address connect timeout. Fixed with `net.setDefaultAutoSelectFamilyAttemptTimeout(2500)`; Overpass timeout raised to 30s |
| 14:36  | Claude | Restaurant route working (Gallo Nero, Portland, 0.4 km, with OSM and website links). Large activities query still timing out                                             |
| 14:37  | Claude | Switched `around:` radius filters to cheaper **bbox** filters, with exact distance filtering in Node                                                                     |
| 14:39  | Claude | Overpass status endpoint took 15s even with free slots, which confirms upstream overload. Decision: handle it honestly in the UI (long-wait hint, retry, clear error)    |

## 14:40–14:50 — Frontend, verification, handoff

| Time        | Who    | Work                                                                                                                                                                                                                                                                                                                            |
| ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~14:40      | Claude | Wrote `src/api.ts`, `icons.ts` (inline SVG only), `format.ts` (escaping, safe URLs, timezone-safe dates), `planner.ts` (ARIA combobox search, header, weather, activities with Indoor/Outdoor filters, restaurant; per-section skeleton, empty, and error states with retry), `styles.css` (Spectre tokens only), and `main.ts` |
| 14:42–14:43 | Claude | Added `tests/weekend.test.ts` (10 tests), npm scripts, `deploy/family-weekend.service`, `deploy/nginx.conf`, `deploy.sh`, `.env.example`. Typecheck ✅, tests 10/10 ✅, build ✅                                                                                                                                                |
| 14:43       | Claude | Headless Chromium screenshots of the empty state at 1366px and 390px. Shortened the mobile placeholder                                                                                                                                                                                                                          |
| 14:43–14:44 | Claude | Desktop Portland run: dropdown showed 8 Portlands; weather, rain-aware activities (OMSI, OMSI Planetarium), restaurant timeout shown as a clean error. **Found:** empty state not hiding; flag emoji rendering as boxes                                                                                                         |
| 14:45       | Claude | Fixes: `.empty[hidden]`, country-code badges instead of flags, one automatic retry for Overpass timeouts                                                                                                                                                                                                                        |
| 14:45       | Claude | Mobile Portland run: full plan including Gallo Nero ✅. `?simulateFail=overpass` on Paris: clear errors with Try again, weather unaffected ✅. Paris on local Sunday → **next** weekend, Sat 14 – Sun 15 Nov ✅                                                                                                                 |
| 14:46–14:48 | Claude | Drafted `README.md`, `VERIFICATION.md`, `AI-USAGE.md`; updated `TODO.md`; full check passed                                                                                                                                                                                                                                     |
| ~14:48      | Dev    | Committed via Codex after a scope review and secret scan                                                                                                                                                                                                                                                                        |

## 14:50–14:55 — Project config and cleanup

| Time   | Who    | Work                                                                                                                                                                                                                                                                              |
| ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14:50  | Claude | Mirrored the spectre-ui root config: ESLint 10 + typescript-eslint (TS 6 alias for lint, TS 7 for `tsc`), Prettier, `.editorconfig`, `.gitattributes`, `.npmrc`, `.nvmrc`, `.vscode/`, CI workflow, Dependabot, PR template, `SECURITY.md`                                        |
| 14:51  | Claude | Formatted the repo, lint clean, full check ✅, smoke test of the server on the new formatting ✅                                                                                                                                                                                  |
| ~14:53 | Claude | Cleanup audit: removed unused `flagEmoji()` and `peekCache()`, the scaffold `#nav-status` leftover, and the scaffold manifest wording; added `check:ecosystem` to `npm run check`. No secrets or IPs found. Full check ✅ (format, lint, typecheck, 10/10 tests, build, manifest) |
| ~14:54 | Claude | This changelog (`CHANGELOG.md`)                                                                                                                                                                                                                                                   |

## 14:55–15:20 — Deploy, speed fix, documentation

| Time         | Who    | Work                                                                                                                                                                                                            |
| ------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~14:57       | Claude | Wrote `deploy/setup-server.sh`, a one-shot idempotent server setup (firewall allows SSH first, Node 24, nginx, `app` user, systemd, sudoers for restart only)                                                   |
| ~15:00       | Dev    | Deployed to the Linode (git clone as `app`, `npm ci`, build, systemd, nginx). Live URL supplied separately with the submission                                                                                  |
| ~15:02       | Dev    | Reported slow API calls and a Toronto activities timeout                                                                                                                                                        |
| ~15:03–15:10 | Claude | Speed fix: one combined Overpass query per city shared by both routes (in-flight de-duplication), no second-radius round trips, backups after 2s, 55s timeout, auto-retry removed, honest "up to a minute" hint |
| ~15:10       | Claude | Toronto verified: one call, ~30s first search, 0s repeat. Full check ✅                                                                                                                                         |
| ~15:12       | Dev    | Redeployed (`git pull`, `npm ci`, build, restart)                                                                                                                                                               |
| ~15:15–15:20 | Claude | Docs: live URL and real git-based install in README, limitations (Overpass, in-memory cache), live server checks in VERIFICATION, developer decisions in AI-USAGE. Live site checked externally                 |

## Remaining (from 15:20)

- [ ] Final commit and submission
