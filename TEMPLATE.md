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

See the round-13 report for measured values.

## Verification checklist

- [ ] Pre-deploy log `workspace 'Docmost' created`; all services SUCCESS.
- [ ] Stranger setup refused (403); owner login; page create; search; upload to the Bucket and download.

## Open questions

- Invitation e-mails untested (no mail provider in the test).
