# Deploy and Host Docmost with Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/docmost-wiki-and-docs-postgres-redis-s3-?referralCode=20H68q)

Docmost is an open-source collaborative wiki and documentation tool, an alternative to Confluence and Notion: spaces, nested pages, real-time co-editing, comments, page history, diagrams (Draw.io, Excalidraw, Mermaid) and permissions. This template runs Docmost with PostgreSQL 18, Redis and a Railway Bucket for files, with your workspace and owner account created on the first deploy.

## About Hosting Docmost

Docmost needs PostgreSQL for content, Redis for real-time collaboration and background jobs, and file storage for attachments. On a fresh database it shows an open "create workspace" page, and whoever submits it first owns the instance. This template creates the workspace and the owner from your variables in a pre-deploy step on a private port, before the public site serves.

Attachments go to a private Railway Bucket through Docmost's S3 driver, so the Docmost service has no volume and redeploys without data loss. New members join through workspace invitations.

## Common Use Cases

- Company wiki and knowledge base organised in spaces
- Product, engineering and API documentation edited together in real time
- Meeting notes, project pages and decision records with comments
- Replacing Confluence or Notion with a self-hosted tool
- Client or team handbooks with page-level permissions

## Dependencies for Docmost Hosting

- Docmost 0.98.0 (official image, pinned by digest)
- PostgreSQL 18 (Railway's `postgres-ssl` image)
- Redis 8.2
- A Railway Bucket for attachments

### Deployment Dependencies

- Docmost source: https://github.com/docmost/docmost
- Self-hosting docs: https://docmost.com/docs/installation
- Environment variables: https://docmost.com/docs/self-hosting/environment-variables
- Railway Buckets: https://docs.railway.com/guides/storage-buckets

### Implementation Details

| Service | What it does | Public |
|---|---|---|
| Docmost | Web app, API and real-time collaboration; pre-deploy creates the workspace and owner | yes |
| Postgres | Pages, users, spaces, history | no |
| Redis | Collaboration sync, queues, cache | no |
| Bucket | Attachments and images (private, served through Docmost) | no |

**First login**

1. Before deploying, set `DOCMOST_ADMIN_EMAIL` to your address (default `admin@example.com`) and optionally `DOCMOST_WORKSPACE_NAME`.
2. Open the Docmost URL and sign in with `DOCMOST_ADMIN_EMAIL` and the generated `DOCMOST_ADMIN_PASSWORD` from the Docmost service's Variables tab.
3. Invite members under Settings > Members. Without e-mail you can copy the invitation link and send it yourself.

**Owner password.** The variables are used once, on the first deploy; change the password later in Account settings. A password shorter than 12 characters is not applied: the owner is then locked with a random password, and you reset it with "Forgot password" (needs e-mail) or by redeploying on an empty database.

**E-mail.** Invitations and password resets need a mail driver. Railway allows SMTP only on Pro; on other plans use Postmark's HTTP API (`MAIL_DRIVER=postmark`, `POSTMARK_TOKEN`) and set `MAIL_FROM_ADDRESS`.

**Custom domain.** Add it to the Docmost service and set `APP_URL` to `https://{your-domain}`, then redeploy.

**Scaling and versions.** Run one Docmost replica (real-time collaboration state is coordinated through Redis, but upstream documents a single instance). The image is pinned by digest in `services/docmost/Dockerfile`. To upgrade, change the tag and digest, back up Postgres and redeploy; migrations run automatically on start.

**Resources.** Measured idle on Railway: Docmost 0.28 GB, Postgres 0.06–0.12 GB, Redis 0.05 GB; about 0.4–0.45 GB in total, roughly $4–5 per month plus Bucket storage. Runs on the Trial plan.

**License.** Docmost's core is AGPL-3.0. Enterprise features in the `ee` folders need a commercial license key and stay inactive without one. This is a community template, not affiliated with Docmost.

### Why Deploy Docmost on Railway?

Railway runs Docmost, PostgreSQL, Redis and file storage in one project with private networking and HTTPS. Your workspace and owner exist before anyone else can reach the site, files live in a Bucket instead of a single volume, and you can add a domain or more resources from the dashboard.
