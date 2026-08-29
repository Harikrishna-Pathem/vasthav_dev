# VASTHAV Phase 1 Architecture

## Monorepo

The repository uses pnpm workspaces for the TypeScript applications and packages. Flutter remains an independent project under `apps/mobile`, which avoids forcing Dart tooling into the JavaScript dependency graph.

## Backend

NestJS is a modular monolith. Its Phase 1 modules are configuration, database, health, common HTTP infrastructure, and an intentionally empty authentication boundary. New business modules belong alongside these rather than in controllers. Prisma owns database access and PostgreSQL is authoritative.

All externally visible routes are versioned below `/api/v1`. Development OpenAPI documentation is exposed at `/api/docs`. Requests receive an `x-request-id`; error responses use a stable envelope and do not expose stack traces. Pino provides structured logs with credential headers redacted. Helmet, CORS controls, validation, and a global throttling baseline are enabled centrally.

## Database conventions

Tables use snake_case; Prisma fields use camelCase. IDs are UUIDs, timestamps use `timestamptz`, and mutable records conventionally have `created_at` and `updated_at`. Soft deletion is a nullable `deleted_at` only for entities where retention is required. Foreign keys and indexes are added with each domain entity. The initial `system_settings` table exists solely to establish these conventions and verify migrations.

## Clients

React uses route-level pages, TanStack Query for server data, a centralized Axios client, an error boundary, and i18next locales. Flutter uses GoRouter, Riverpod, a centralized Dio client, secure storage, and ARB localization. Both provide English, Telugu, and Hindi foundation strings. Dynamic surveys and question translations will come from the API, never client source files.

## Local infrastructure

Docker Compose starts PostgreSQL and a backend image. Redis is intentionally deferred until background queues/caching are introduced, but backend modules must not assume in-process state for future work.
