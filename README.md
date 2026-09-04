# AI Credit Decisioning Platform

Production-oriented backend foundation for a future multi-tenant credit decisioning platform.

## Setup

1. Copy `.env.example` to `.env` and provide a PostgreSQL connection string.
2. Install dependencies with `npm install`.
3. Generate the Prisma client with `npm run prisma:generate`.
4. Start development mode with `npm run dev`.

To create the initial PostgreSQL schema, run `npm run prisma:migrate -- --name init_multitenancy`.
For local development data, run `npx prisma db seed` after migrating.

## Available commands

- `npm run dev` — run the API with file watching.
- `npm run build` — compile TypeScript to `dist`.
- `npm start` — run the compiled API.
- `npm test` — run the Vitest suite.
- `npm run lint` — run ESLint.
- `npm run format` — format source files with Prettier.
- `npm run prisma:generate` — generate Prisma Client.
- `npm run prisma:migrate -- --name <name>` — create and apply a development migration.
