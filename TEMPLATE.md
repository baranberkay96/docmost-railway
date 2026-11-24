# Docmost Wiki and Docs (Postgres, Redis, S3 Bucket): composer spec

## Listing

| Field | Value |
|---|---|
| Name | **Docmost Wiki and Docs (Postgres, Redis, S3 Bucket)** |
| Description | Real-time collaborative wiki with spaces; owner preset, files in Bucket. (72 chars) |
| Category | Other |
| Icon | `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docmost.png` |
| Repo | `baranberkay96/docmost-railway`, root `/services/docmost` |

Version label: Docmost is 0.x (0.98.0), so the listing carries no version.

## Base market templates (checked 2026-11-24)

| Code | Active | Notes |
|---|---|---|
| `W4t6Ei` | 53 | `docmost:latest`, `valkey:latest` with a Bitnami volume path, local storage volume; open setup page |
| `docmost` | 11 | `docmost:latest`, Redis 8.2.1, Postgres 17, open setup page |
| `docmost-open-source-wiki` | 8 | same pattern |

## Services

| Service | Source | Port | Healthcheck | Volume |
|---|---|---|---|---|
| Docmost | repo `/services/docmost` (`FROM docmost/docmost:0.98.0@sha256:c3bdc847…`), pre-deploy `node /app/railway/predeploy.mjs` (1500 s) | 3000 public | `/api/health` (600 s) | — |
| Postgres | `postgres-ssl:18.6` | 5432 private | — | `/var/lib/postgresql/data` |
| Redis | `redis:8.2.11` | 6379 private | — | `/data` |
| Bucket | Railway Bucket (`STORAGE_DRIVER=s3`) | — | — | — |

## Design

1. **Workspace and owner before serving (8.37).** Docmost's `POST /api/auth/setup` is open while no workspace exists. The pre-deploy step boots Docmost on 127.0.0.1:3999 inside the pre-deploy container (migrations run there), calls the setup API with the `DOCMOST_ADMIN_*` values and stops it. Later deploys see `workspaces > 0` and skip.
2. **Attachments in a private Bucket** via Docmost's S3 driver; files are streamed through Docmost, so no CORS rule and no volume.
3. **Deploy-form values (8.29):** invalid e-mail → `admin@example.com`; a password outside 12–70 characters is replaced by a random one (owner locked, logged); names are trimmed to Docmost's 50-character, no-URL rules.
4. **E-mail:** SMTP needs Pro; Postmark (HTTP) documented as the alternative. Gotenberg is not included: PDF export is an enterprise (`ee`) feature.

## Improvements over market templates

- No claimable setup page, pinned digest, healthcheck, Bucket storage, private Postgres/Redis, telemetry off.

## Resources

Measured on Railway (2026-11-24, idle after login, a page, a search and an upload):

| Service | Idle RAM | CPU idle |
|---|---|---|
| Docmost | 0.28 GB | < 0.01 vCPU |
| Postgres | 0.06–0.12 GB | < 0.01 |
| Redis | 0.05 GB | < 0.01 |

Total ≈ 0.4–0.45 GB → ≈ $4–5/month idle RAM plus Bucket storage. Fits Trial's 1 GB per service.

## Verification checklist

- [x] Pre-deploy log `Postgres reachable`, `Redis reachable`, `workspace 'Docmost' created; owner admin@example.com`; all services SUCCESS, `/api/health` 200.
- [x] Stranger `POST /api/auth/setup` → 403 "Workspace setup already completed."
- [x] Owner login (cookie `authToken`), role owner, space "General"; page create; search finds it.
- [x] Upload (`/api/files/upload`) stored under the workspace prefix in the Bucket and downloaded byte-identical through Docmost.
- [x] `DOCMOST_ADMIN_PASSWORD=abc` on an existing workspace: redeploy SUCCESS (the value is only used on a fresh database, where it would be replaced by a locked random password).

## Open questions

- Invitation e-mails untested (no mail provider in the test).
