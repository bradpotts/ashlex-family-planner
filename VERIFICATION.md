# Verification Notes

Checks run on 8 Nov 2026, against live APIs, in a local production build
(`npm run build`, then `node server/index.ts`, viewed in headless Chromium).
Re-run the deployment checks on the Linode after install.

| # | Check | How | Result |
| --- | --- | --- | --- |
| 1 | `npm run check`: client and server typecheck, unit tests, build | Automated | ✅ Pass: 10/10 tests |
| 2 | Weekend date rule (weekday, Fri, Sat, Sun, LA-vs-Tokyo same instant, year rollover, invalid tz) | Automated (`tests/weekend.test.ts`, node:test) | ✅ Pass |
| 3 | **Normal city search**: "Paris" → Paris, Île-de-France, France | Manual (headless Chromium, 1366px) | ✅ Weather cards show dates, conditions, °C high/low, rain % and mm, source, and retrieved time. Local time was Sunday 8 Nov, so the target weekend was correctly **Sat 14 – Sun 15 Nov** |
| 4 | **Shared city name**: "Portland" | Manual | ✅ 8 results, each labelled with region and country (Oregon, Maine, Indiana, Texas, England GB, …). Portland, Oregon (local Saturday 22:43) → weekend Sat 7 – Sun 8 Nov, with rain flagged. Activities: OMSI (Science museum, indoor) and OMSI Planetarium, both with "rain likely" notes and OSM and website links. Restaurant: Gallo Nero, 0.4 km, with OSM link and hours caveat |
| 5 | **Failed source**: `?simulateFail=overpass` (Paris) | Manual | ✅ Activities and restaurant each show a red alert ("…We're not showing anything in its place rather than guess.") with **Try again**. Weather still loads independently |
| 6 | Real upstream failure | Observed | ✅ During one Portland run the restaurant query timed out at Overpass. The UI showed "The data source took too long to respond." with Try again. This led to adding one automatic retry |
| 7 | Bad input | Automated (curl) | ✅ `tz=Not/AZone` → HTTP 400 JSON error; `simulateFail=weather` → HTTP 503 JSON |
| 8 | **Desktop layout** (1366px) | Manual, screenshot | ✅ Weather full width; activities and restaurant side by side; no broken assets (inline SVG only) and no console errors other than expected 5xx in failure tests |
| 9 | **Mobile layout** (390px) | Manual, screenshot | ✅ Single column, readable, no horizontal scroll; search dropdown usable |
| 10 | Keyboard search | Manual | ✅ Type → ↓/↑ → Enter selects; Esc closes; combobox and listbox ARIA in place |
| 11 | Empty state and loading | Manual | ✅ Empty state before search; skeletons plus an Overpass "up to 30 seconds" hint while loading |

## Issues found and fixed during verification

- Node `fetch` to overpass-api.de failed with `ETIMEDOUT` in 0.5s while
  `curl` worked. Cause: Node's 250ms happy-eyeballs per-address timeout. Fix:
  `net.setDefaultAutoSelectFamilyAttemptTimeout(2500)`.
- Overpass `around:` queries took too long. Fix: bbox filters plus an exact
  distance filter in Node, and hedged mirrors.
- Flag emoji rendered as empty boxes (also the case on Windows). Fix: replaced
  with text country-code badges.
- The empty-state panel stayed visible after selecting a city (CSS `display`
  overrode `hidden`). Fix: `.empty[hidden]`.

## To re-check on the server

- [ ] `http://<server-ip>/` loads; Portland and Paris both work
- [ ] `ss -tlnp` shows Node on 127.0.0.1:3000 only; `ufw status` shows 22 and 80
- [ ] Log out of SSH, then the app still responds; `reboot`, then it comes back
- [ ] `curl -I http://<server-ip>/` shows no `X-Powered-By` and no nginx version
