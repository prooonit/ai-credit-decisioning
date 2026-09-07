# AI Credit Decisioning Platform

A production-oriented, multi-tenant backend for AI-assisted credit decisioning.

The platform allows businesses to create their own tenant, manage customers, define and version credit policies, create loan applications, collect financial evidence, and evaluate applications using AI-assisted analysis combined with a deterministic policy engine.

> **Core principle:** AI assists the decisioning workflow, but the final credit decision is always made by the deterministic policy engine.

---
<img width="1536" height="1024" alt="ChatGPT Image Sep 7, 2026, 01_37_44 AM" src="https://github.com/user-attachments/assets/e7f960e3-528a-4f60-9f9f-6fa7f6a4d50b" />

## Demo

🎥 [Watch the Demo](https://www.loom.com/share/34429b209bff49e0abdcde9d3a2681fd)

🔗 [Live API](https://ai-credit-decisioning.onrender.com)


## Why I Built This

I wanted to explore how AI could be used in a credit decisioning workflow
without allowing an LLM to make an untrusted final decision.

The core principle is:

AI analyzes evidence → deterministic policy engine makes the decision.


## Problem

Credit decisioning requires combining multiple sources of financial evidence
and applying business-specific policies.

A production system needs to handle:

- Multiple businesses/tenants
- Different users and roles
- Versioned credit policies
- Financial evidence from multiple providers
- Unreliable AI output
- Explainable decisions
- Auditability of historical decisions

## Decision Workflow

1. User creates a loan application
2. Server loads the tenant's active policy
3. Financial provider abstractions collect evidence
4. Evidence is sent to the AI analysis layer
5. Groq returns structured analysis
6. AI output is validated with Zod
7. Deterministic policy engine evaluates business rules
8. Final decision is stored with the policy version


## Getting Started

### Clone

git clone https://github.com/prooonit/ai-credit-decisioning.git

cd ai-credit-decisioning

### Install

npm install

### Environment

Create `.env`:

-DATABASE_URL="..."

JWT_SECRET="..."

GROQ_API_KEY="..."

GROQ_MODEL="openai/gpt-oss-20b"

AI_PROVIDER="groq"

### Database
npx prisma migrate dev

### Run
npm run dev

## Synthetic Financial Data

This project uses synthetic financial data for demonstration purposes.

The credit, banking, liability, and identity providers are implemented behind
provider abstractions. In a real production system, these interfaces could be
connected to authorized external financial data providers.

## Available commands

- `npm run dev` — run the API with file watching.
- `npm run build` — compile TypeScript to `dist`.
- `npm start` — run the compiled API.
- `npm test` — run the Vitest suite.
- `npm run lint` — run ESLint.
- `npm run format` — format source files with Prettier.
- `npm run prisma:generate` — generate Prisma Client.
- `npm run prisma:migrate -- --name <name>` — create and apply a development migration.
  
