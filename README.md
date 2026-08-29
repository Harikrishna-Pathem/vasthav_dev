# VASTHAV

VASTHAV is a multilingual surveying and data-collection platform. Phase 1 establishes the production-oriented monorepo, API, web, and Flutter foundations; it intentionally contains no product workflows.

## Architecture

- `apps/backend`: NestJS REST API, Prisma, PostgreSQL, OpenAPI.
- `apps/web`: React/Vite administration foundation.
- `apps/mobile`: Flutter respondent-app foundation.
- `packages/shared-types`: deliberately small cross-client API contracts.
- `infrastructure`: local deployment resources.

Further detail is in [docs/architecture.md](docs/architecture.md).

## Prerequisites

Node.js 22+, pnpm 9+, Docker Desktop, and Flutter SDK 3.4+ are required. Use a PostgreSQL database locally or Docker Compose.

## Setup

1. Copy `.env.example` to `.env` and replace `JWT_ACCESS_SECRET` with a secure value (at least 32 characters).
2. Copy `apps/web/.env.example` to `apps/web/.env` if the default API address differs.
3. Run `corepack enable` then `pnpm install`.
4. Start PostgreSQL: `docker compose up -d postgres`.
5. Create the schema: `pnpm --filter @vasthav/backend prisma:deploy`.

## Run

- Backend: `pnpm --filter @vasthav/backend start:dev`
- API health: `http://localhost:3000/api/v1/health`
- Swagger in development: `http://localhost:3000/api/docs`
- Web: `pnpm --filter @vasthav/web dev`
- Mobile: `cd apps/mobile; flutter pub get; flutter run --dart-define=API_BASE_URL=http://<host>:3000/api/v1`

Android emulators use `10.0.2.2` as the default API host. Supply a reachable LAN address on physical devices.

## Quality checks

Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`. For mobile run `cd apps/mobile; flutter analyze; flutter test`.

## Environments

`development` is for local tooling. `test` must use a separate database. `production` requires managed secrets, HTTPS, restrictive CORS origins, production database credentials, and deployment-provided configuration. Never commit `.env` files.
