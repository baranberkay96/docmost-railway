# Notice

This repository is a Railway template package for Docmost. It contains configuration and a small pre-deploy script written for this template (MIT-licensed); it does not contain Docmost source code.

| Component | License | Used as |
|---|---|---|
| Docmost 0.98.0 | AGPL-3.0 (core); files under `ee` directories use the Docmost Enterprise license and need a key | Official image `docmost/docmost:0.98.0@sha256:c3bdc847…`, extended with our pre-deploy script |
| PostgreSQL 18 | PostgreSQL License | `ghcr.io/railwayapp-templates/postgres-ssl:18.6` (Railway) |
| Redis 8.2 | RSALv2 / SSPLv1 / AGPLv3 | `redis:8.2.11` (official image, unmodified) |

## Our own code

- `services/docmost/railway/predeploy.mjs`: waits for Postgres and Redis and, on a fresh database, starts Docmost on a private port in the pre-deploy container and calls Docmost's own setup API (`POST /api/auth/setup`) to create the workspace and owner.

## Upstream files checked (tag v0.98.0)

- `.env.example`, `Dockerfile`, `apps/server/package.json`, `apps/server/src/main.ts`, `apps/server/src/integrations/environment/environment.service.ts`, `apps/server/src/core/auth/auth.controller.ts`, `apps/server/src/core/auth/guards/setup.guard.ts`, `apps/server/src/core/auth/dto/create-admin-user.dto.ts`, `apps/server/src/database/database.module.ts`, `apps/server/src/database/services/migration.service.ts`

Docmost is a trademark of its owners. This community template is not affiliated with or endorsed by Docmost.
