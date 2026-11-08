# Security Policy

This repository is a time-boxed technical assessment (Family Weekend Planner),
not a supported product.

## Reporting a Vulnerability

Do not open a public issue for security problems. Contact the maintainer through
GitHub, including a description, reproduction steps, and the impact.

## Security Posture

- No secrets: all data sources (Open-Meteo, OpenStreetMap/Overpass) are free and
  keyless. `.env` is git-ignored; `.env.example` holds placeholders only.
- All third-party calls are made server-side; the browser only calls `/api/*`.
- Node binds to `127.0.0.1`; nginx on port 80 is the only public web service.
  The firewall allows SSH (22) and HTTP (80) only.
- The service runs as an unprivileged `app` user with systemd hardening.
- Inputs are validated; all OpenStreetMap text is escaped before rendering, and
  only `http(s)` links are rendered.
- Security headers: Content-Security-Policy, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`; `X-Powered-By` and nginx
  `server_tokens` are disabled.
- Server IPs, credentials, and SSH keys never appear in tracked files.
