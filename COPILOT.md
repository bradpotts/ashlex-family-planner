# COPILOT.md — Family Weekend Planner

GitHub Copilot is the scoped development support assistant for the Family
Weekend Planner. Shared rules live in [AGENTS.md](AGENTS.md). Inline-suggestion
rules are restated in
[.github/copilot-instructions.md](.github/copilot-instructions.md).

## Scope

- Targeted edits, refactors, tests, and doc fixes inside `src/`, `server/`, and
  the repo docs
- No ownership of architecture, product scope (`SPEC.md`), or server deploys

## Authority

Copilot may commit and push its own small, validated changes directly to `main`.
It runs `npm run check` first and never commits a failing state. No pull
requests and no AI co-author trailers.

## Handoff

Report the files edited, the task completed, and the `npm run check` result.
