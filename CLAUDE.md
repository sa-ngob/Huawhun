# Project: Hostinger VPS (Ubuntu 24.04) + Docker Compose + PostgreSQL
You are coding for deployment on a Hostinger VPS. Prioritize compatibility, simple ops, and repeatable deploys.

## Target environment
- VPS: Hostinger KVM, Ubuntu 24.04
- Deployment: Docker Compose (production)
- Reverse proxy: (choose one)
 - If Traefik is already used on the VPS, prefer Traefik labels.
 - Otherwise, expose app port and let the user handle proxy separately.
- Database: PostgreSQL in Docker with a named volume for persistence.

## Repository conventions
- Keep all deploy artifacts in ./deploy
 - ./deploy/docker-compose.yml
 - ./deploy/.env.example (never commit real secrets)
- App should read configuration from environment variables (12-factor).
- Provide a single, documented command flow for deploy/update.

## Docker/Compose requirements
- Use Compose v2 syntax.
- Avoid privileged containers unless required.
- Add healthchecks for app and db where feasible.
- Use restart policies:
 - db: restart: unless-stopped
 - app: restart: unless-stopped
- Persist PostgreSQL data using a named volume: postgres_data
- Do NOT bake secrets into images. Use environment variables from .env on the server.

## PostgreSQL (Docker) standards
- Image: postgres:16-alpine (or 15-alpine if app requires)
- Required env:
 - POSTGRES_DB
 - POSTGRES_USER
 - POSTGRES_PASSWORD
- Connection string format (prefer):
 - DATABASE_URL=postgresql://USER:PASSWORD@db:5432/DB?sslmode=disable
- Expose DB port publicly ONLY if explicitly required.
 - Default: do not publish 5432; app connects via internal docker network.

## App configuration contract (must support)
- PORT (internal listening port; default 3000 unless framework differs)
- DATABASE_URL
- NODE_ENV=production (for Node apps)
- TRUST_PROXY=1 if running behind reverse proxy

## Logging/observability
- Log to stdout/stderr only (no file logs in container).
- Keep logs structured if easy (JSON) but not required.

## Security
- Never commit .env files.
- Provide minimal required ports:
 - If behind proxy: app container should not publish public ports (only expose internally).
 - If no proxy: publish 80/443 via proxy or publish app port explicitly (user choice).
- Default to least exposure: DB not public.

## Deploy workflow (Hostinger-friendly)
Assume deployment on the VPS via SSH and docker compose:
1) Copy repo to server (git clone) into /opt/<app-name> or /var/www/<app-name>
2) Create /opt/<app-name>/deploy/.env from .env.example
3) Run:
 - docker compose -f deploy/docker-compose.yml pull
 - docker compose -f deploy/docker-compose.yml up -d
4) Update:
 - git pull
 - docker compose -f deploy/docker-compose.yml up -d --build

## Deliverables you must produce with code changes
- ./deploy/docker-compose.yml
- ./deploy/.env.example
- README section "Deploy on Hostinger VPS" with exact commands
- If migrations are needed, provide a one-liner:
 - docker compose -f deploy/docker-compose.yml exec app <migration-command>

## Compose template (guideline)
Services:
- db:
 - image: postgres:16-alpine
 - environment: POSTGRES_DB/USER/PASSWORD
 - volumes: postgres_data:/var/lib/postgresql/data
 - healthcheck: pg_isready
 - networks: internal
- app:
 - build: .
 - environment: DATABASE_URL, PORT, NODE_ENV
 - depends_on: db (with health condition if supported)
 - networks: internal (+ proxy network if using Traefik)
Volumes:
- postgres_data:

## Notes for AI coding
- Keep paths Linux-friendly.
- Avoid platform-specific scripts (Windows).
- Prefer deterministic builds and pinned major versions.
- If adding Nginx/Traefik configs, place them under ./deploy as well.
