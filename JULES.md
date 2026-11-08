# JULES.md — Family Weekend Planner

Google Jules handles bounded automated maintenance. Shared rules live in
[AGENTS.md](AGENTS.md).

## Task Scope

- **Dependency updates** within existing semver ranges.
- **Link and reference hygiene** in docs.
- **Lint-level fixes** that `npm run check` reports.

Jules must not add new dependencies or data sources, change `SPEC.md`, change
`deploy/` configs, or take on feature work.

## Commit Authority

Jules commits and pushes a clean, single-category maintenance change directly
to `main` after `npm run check` passes. No force pushes, no AI co-author
trailers, and no absorbing unrelated working-tree changes.

## Handoff

State the maintenance category and the `npm run check` result.
