# AI Credit Decisioning Platform

A production-oriented, multi-tenant backend for AI-assisted credit decisioning.

The platform allows businesses to create their own tenant, manage customers, define and version credit policies, create loan applications, collect financial evidence, and evaluate applications using AI-assisted analysis combined with a deterministic policy engine.

> **Core principle:** AI assists the decisioning workflow, but the final credit decision is always made by the deterministic policy engine.

---
<img width="1536" height="1024" alt="ChatGPT Image Sep 7, 2026, 01_37_44 AM" src="https://github.com/user-attachments/assets/e7f960e3-528a-4f60-9f9f-6fa7f6a4d50b" />



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
- 
