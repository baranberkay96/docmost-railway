# Docmost for Railway: the official image pinned by digest, plus a pre-deploy step
# that waits for the databases and creates the workspace and its first admin
# before the public port serves (the setup page is open until then).
ARG DOCMOST_IMAGE=docmost/docmost:0.98.0@sha256:c3bdc84767de0fc9431763523636ddfd783c35c25ef7d4a3c95c064628e78d7a
FROM ${DOCMOST_IMAGE}

COPY --chown=node:node --chmod=0755 railway/ /app/railway/

# Image default command: node dist/main (working directory /app/apps/server)
