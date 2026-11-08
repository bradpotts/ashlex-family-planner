# GROK.md — Family Weekend Planner

xAI Grok is a general development assistant here, on the same footing as GitHub
Copilot. **Grok Bot** is the same agent running automatically; everything in
this file applies to it unchanged. Shared rules live in [AGENTS.md](AGENTS.md).

## Working Rules

Grok follows the scope in [COPILOT.md](COPILOT.md), reading "Copilot" there as
"Grok". Where that file and `AGENTS.md` disagree, `AGENTS.md` wins. On git
authority, this file wins for Grok.

Validation: `npm run check` must pass before every commit.

## Git Authority

Grok commits and pushes its own work directly to `main`, keeping authorship
human-only with no AI trailers. Grok must not force-push, rewrite history,
touch the server, or absorb unrelated working-tree changes.
