# AI Usage

## Tools

| Tool                                 | Used for                                                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Claude Code (Claude Opus) in VS Code | Repo agent docs, backend and frontend implementation, debugging, headless-browser screenshots, and drafting the handoff docs |
| ChatGPT                              | Planning and drafting the build prompt (stack, routes, scoring, deploy layout)                                               |
| OpenAI Codex                         | Repository and handoff review, secret scan, validation, and git execution                                                    |

## How the output was verified

- `npm run check` (strict typecheck for client and server, unit tests, build)
  after each stage.
- Every route was called with curl against live APIs and the JSON inspected.
- The UI was screenshotted at 1366px and 390px with headless Chromium, and each
  screenshot was reviewed.
- Failure paths were forced with `?simulateFail=` and observed live.
- The weekend date rule has unit tests (Saturday, Sunday, weekdays, and a
  timezone-crossing case).

## Corrections and decisions made by the developer

- **Data sources**: chose keyless Open-Meteo and OpenStreetMap over Google
  Places, so there are no cost, no secrets, and every place has a verifiable
  public link.
- **Stack**: kept the developer's own Spectre design system for a consistent
  look, rather than an AI-suggested generic UI kit.
- Set the honesty rules up front in `AGENTS.md`, `CLAUDE.md`, and `SPEC.md`: no
  invented facts, a source and timestamp on everything, explicit "couldn't
  verify" states.
- Specified a `?simulateFail=` hook so failure states can be demonstrated on
  demand.
- _(Add your own here: anything you changed, rejected, or decided after
  reviewing the AI output.)_

## Issues the AI hit, and how they were resolved

- Overpass timed out from Node but not from curl. Diagnosed as Node's
  happy-eyeballs 250ms attempt timeout; fixed with
  `net.setDefaultAutoSelectFamilyAttemptTimeout(2500)`.
- Public Overpass was slow (15–25s). Changed to bbox queries and hedged mirrors,
  with one automatic client retry and a visible "up to 30 seconds" hint.
- Flag emoji rendered as empty boxes in Chromium on Linux (and on Windows), so
  they were replaced with text country-code badges.

## Representative prompts (credentials and server details removed)

1. **Setup**: "Copy the AI agent files from my other project and customise them
   for this assessment. Keep the spec and context." (Pasted the Ashlex brief.)
2. **Build spec**: "Build 'Family Weekend Planner' in this repo (spectre-init
   shell-app). Backend: server/index.ts on Node 24 with Express 5; all external
   calls server-side with timeouts, a TTL cache, and retrievedAt;
   `?simulateFail=`; input validation. Routes: /api/geocode (Open-Meteo),
   /api/weekend (city-local Saturday logic, WMO mapping, wet flag),
   /api/activities (Overpass, scored and weather-aware), /api/restaurant
   (Overpass, Italian, or a clear 'couldn't verify'). Frontend: debounced search
   showing Name, Region, Country; weather cards; Indoor/Outdoor filters;
   per-section skeleton, empty, and error states with retry; attribution footer.
   Also a systemd unit, nginx config, deploy.sh, and a node:test test for the
   weekend logic."
3. **Troubleshooting** (by the agent, while verifying): probing each Overpass
   mirror with curl versus Node fetch to isolate the ETIMEDOUT.
4. **Verification**: headless Chromium screenshots for "Portland" (shared name),
   "Paris" (normal), `?simulateFail=overpass` (failure), at 1366px and 390px.
5. **Commit review**: "Can we commit the changes so far?" Codex reviewed the
   staged scope and handoff files, scanned for secrets, and ran the full
   validation gate before committing.

Omitted: the full chat transcript (long, and it contains local paths). The
prompts above are representative.
