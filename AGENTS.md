# Family Weekend Planner — Agent Guide

The Family Weekend Planner is a timed (two-hour) technical assessment for
Ashlex. It is a small, polished web app that helps a family plan a weekend in
any city: weekend weather, two activities for children aged 4–8, and one Italian
restaurant, all from real sources with honest uncertainty handling. It is
deployed to an Ashlex-supplied Ubuntu Linode. Ashlex explicitly **encourages AI
tools**; the developer remains responsible for understanding and checking
everything that ships.

## Repository Snapshot

| Field                  | Value                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| Assessor               | Ashlex                                                                                      |
| Human owner            | Bradley Potts                                                                               |
| Developer              | PHCDevworks                                                                                 |
| Repository role        | Assessment deliverable: app, source, and handoff docs                                       |
| Stack (default)        | TypeScript · Vite SPA · Node + TypeScript API (`server/`) · nginx · systemd · Ubuntu Linode |
| Data sources (default) | Open-Meteo (geocoding + forecast) · OpenStreetMap / Overpass (activities + restaurant)      |
| Product spec           | [SPEC.md](SPEC.md)                                                                          |
| Work queue             | [TODO.md](TODO.md)                                                                          |
| Validation gate        | `npm run check`                                                                             |

## Standard Workflow

1. Read this file, then the agent-specific guide for the task.
2. Check [TODO.md](TODO.md) and the relevant section of [SPEC.md](SPEC.md).
3. **Respect the clock.** Work in TODO priority order (P0 → P3). A working,
   honest, deployed app beats an unfinished polished one.
4. Make the smallest change that satisfies the task.
5. Run `npm run check`.
6. Update `TODO.md`, and log notable prompts and decisions in `AI-USAGE.md` (it
   is a graded deliverable).

## Documentation Map

| Guide        | Path                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------- |
| Agent rules  | [AGENTS.md](AGENTS.md)                                                                        |
| Claude Code  | [CLAUDE.md](CLAUDE.md)                                                                        |
| Codex        | [CODEX.md](CODEX.md)                                                                          |
| Copilot      | [COPILOT.md](COPILOT.md) · [.github/copilot-instructions.md](.github/copilot-instructions.md) |
| Jules        | [JULES.md](JULES.md)                                                                          |
| Grok         | [GROK.md](GROK.md)                                                                            |
| Product spec | [SPEC.md](SPEC.md)                                                                            |
| Work queue   | [TODO.md](TODO.md)                                                                            |
| Handoff docs | `README.md` · `VERIFICATION.md` · `AI-USAGE.md`                                               |

## Mission

Focused, attractive, reliable, and honest. Every fact on screen is either
sourced and timestamped, or clearly marked as unavailable or unverified.

## Core Rules

1. **Never invent facts.** No made-up forecasts, places, opening hours, prices,
   or availability. If a source fails or returns nothing suitable, the UI says
   so. Sample data, if any, is visibly labelled **Sample data** and never
   presented as live.
2. **Every recommendation carries a source link and a `retrievedAt` time.** API
   responses use a shape like
   `{ status: "ok" | "empty" | "error", data, source, retrievedAt }`.
3. **City-local time only.** Weekend dates come from the selected city's IANA
   timezone (Saturday → today and tomorrow; Sunday → next Saturday and Sunday).
   This logic has unit tests.
4. **Disambiguate cities.** Every search result shows region (`admin1`) and
   country.
5. **External calls go through the server.** The browser talks only to `/api/*`.
   API keys (if any are ever needed) live in server env vars only, never in
   `src/`, the built bundle, or committed files.
6. **Free and authorized sources only.** No paid APIs or anything that could
   incur charges without Ashlex's prior agreement. Respect provider usage
   policies (identify the app with a generic User-Agent, cache where practical).
7. **Every data panel has loading, empty, and error states.** No broken images:
   use inline SVG icons or local assets.
8. **Visual consistency comes from one token set.** Use design tokens (Spectre
   `var(--sp-*)` if installed, otherwise a single `:root` custom-property file)
   rather than scattered raw values.
9. **TypeScript-first.** App, server, and scripts are TypeScript with `strict`
   on.

## Server and Security Rules

- **Never** change the root password or keys, disable root login, remove
  Ashlex's SSH access, or block port 22. Before enabling `ufw`, allow OpenSSH
  **first**.
- Run the app as a dedicated non-root user (for example `planner`) under
  `systemd` with `Restart=always`.
- Node binds to `127.0.0.1`; only nginx (port 80) and SSH (22) are exposed.
- No secrets in the repo. `.env` is git-ignored; `.env.example` holds
  placeholders only.
- Never write the server IP, root credentials, or SSH keys into tracked files,
  prompts logs, or screenshots.

## Escalate Instead of Deciding

Stop and ask Bradley Potts before:

- changing the default stack or data sources in `SPEC.md` §5
- adding any API that needs a key, sign-up, or billing
- any server action that touches SSH config, root credentials, or the firewall
  beyond allowing 22 and the app port
- cutting scope from a SPEC requirement, which must then be documented as
  unfinished in `README.md`

## Source of Truth

| Layer         | Path                                            | Rule                                                     |
| ------------- | ----------------------------------------------- | -------------------------------------------------------- |
| Product scope | `SPEC.md`                                       | Code implements the spec                                 |
| Frontend      | `src/`                                          | Talks only to `/api/*`                                   |
| API           | `server/`                                       | Owns all external calls, normalization, and date logic   |
| Deploy        | `deploy/`                                       | nginx config, systemd unit, and setup notes (no secrets) |
| Validation    | `package.json` scripts                          | `npm run check` is the gate                              |
| Handoff       | `README.md` · `VERIFICATION.md` · `AI-USAGE.md` | Must match real behavior and real check results          |

## Validation Gate

```bash
npm run check   # format:check + lint + typecheck + test + build + check:ecosystem
```

| Step       | Command             | Verifies                                                          |
| ---------- | ------------------- | ----------------------------------------------------------------- |
| Typecheck  | `npm run typecheck` | Strict TS across `src/` and `server/`                             |
| Unit tests | `npm test`          | Vitest: weekend date logic, response normalization, failure paths |
| Build      | `npm run build`     | Frontend and server build succeed                                 |

Each UI or behavior change states whether it was checked in a browser, and at
which widths (desktop and about 375px mobile).

## Required Verification Cases

Record each in `VERIFICATION.md`, marked manual or automated:

1. A normal city search (for example Paris, FR)
2. A shared city name (for example Springfield, Portland, London)
3. A failed or unavailable source (for example by forcing the Overpass URL to an
   invalid host via env, or simulating a timeout)
4. Desktop and mobile layouts

## Confidential Information

Never record server IPs, credentials, SSH keys, or private Ashlex details in
tracked files, git metadata, prompt logs, or handoffs. `AI-USAGE.md` prompts are
redacted before they are committed.

## Authority Model

| Agent          | Role                                                                        | Authority                                              |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| Claude Code    | Lead implementation and validation                                          | **No git access**; hands off to Codex or Bradley Potts |
| OpenAI Codex   | Docs consistency, handoff readiness, git execution for Claude-authored work | Commit and push                                        |
| GitHub Copilot | Development support                                                         | Scoped commits per `COPILOT.md`                        |
| xAI Grok       | Development support                                                         | Commits its own work per `GROK.md`                     |
| Google Jules   | Bounded maintenance                                                         | Small single-category fixes per `JULES.md`             |
| ChatGPT        | Strategy and design support                                                 | No repository access                                   |

- Git-authorized agents work directly on `main`. No PRs unless Bradley Potts
  asks.
- **Commit authorship is human-only.** No AI author, co-author, or
  `Co-Authored-By:` trailers. AI involvement is disclosed in `AI-USAGE.md`
  instead.
- Server deploys and root-level actions are run or approved by Bradley Potts.

## Standard Handoff

Every AI-prepared change reports:

- files changed
- validation performed (`npm run check` result) and validation skipped
- whether it was checked in a browser (desktop and mobile)
- information-quality impact (new source, new failure state: yes/no)
- remaining risk and any items to add to README "Known limitations"
