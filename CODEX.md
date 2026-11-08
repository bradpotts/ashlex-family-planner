# CODEX.md — Family Weekend Planner

Read [AGENTS.md](AGENTS.md) first. It defines the shared rules, validation,
boundaries, and authority model.

## Role

Codex owns documentation consistency, handoff readiness, repo hygiene, and git
execution for Claude-authored work. Claude Code remains the implementation lead.
Codex validates, reviews, commits, and pushes, without taking over product or
architecture decisions.

## Entry Point

1. Read `AGENTS.md`, then `CLAUDE.md`, then this file.
2. Review `TODO.md` and `SPEC.md` for current scope.

## Core Responsibilities

- Run and interpret `npm run check` before every commit of handed-off work.
- Check that `README.md`, `VERIFICATION.md`, and `AI-USAGE.md` match the real
  behavior and real check results, and that every SPEC §7 deliverable is
  present.
- Confirm no secrets, server IPs, or credentials appear in tracked files, and
  that `.env.example` holds placeholders only.
- Execute git actions Claude Code cannot perform: stage only the handed-off
  paths, commit with the human identity, and push `main`.

## Final Submission Check (on request)

1. `npm run check` passes.
2. README covers install/start/restart, survival after logout, services, ports,
   APIs, decisions, and limitations.
3. VERIFICATION covers all four required cases, marked manual or automated.
4. AI-USAGE lists tools, verification, at least one human correction, and
   redacted prompts.
5. Commit and push.

## Boundaries

- Never reset, discard, or overwrite changes Codex did not make.
- Never add AI author or co-author trailers.
- Never touch the server.
