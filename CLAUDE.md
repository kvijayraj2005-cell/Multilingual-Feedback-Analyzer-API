# CLAUDE.md — Multilingual Feedback Analyzer API

This file tells Claude Code everything it needs to know to work effectively in this codebase.

---

## Project Overview

**Multilingual Feedback Analyzer API** — A Node.js/TypeScript/Express REST API that analyzes customer feedback written in Tamil, Sinhala, English, Singlish, and Tanglish (code-mixed text). Uses Google Gemini 2.5 Flash for structured AI analysis. Built for Sri Lankan businesses and international SaaS companies.

- **GitHub:** multilingual-feedback-analyzer
- **Author:** Nivash — University of Sri Jayewardenepura
- **Stack:** Node.js 20 + TypeScript 5 + Express 4 + PostgreSQL 16 (via Postgres.app) + Prisma 7 + `@prisma/adapter-pg` + Gemini 2.5 Flash

---

## Commands

```bash
# Development
npm run dev              # Start dev server with nodemon (ts-node)
npm run build            # Compile TypeScript → dist/
npm start                # Run compiled output

# Database
npx prisma migrate dev   # Create and apply a new migration
npx prisma migrate deploy # Apply migrations in production
npx prisma studio        # Open Prisma GUI
npx prisma generate      # Regenerate Prisma client after schema change

# Testing
npm test                 # Run Vitest test suite
npm run test:coverage    # Coverage report

# Linting
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix lint errors
npm run format           # Prettier format

# Docker
docker-compose up -d postgres   # Start only Postgres
docker-compose up               # Start full stack
docker-compose down             # Stop all containers
```

---

## Architecture

```
src/
├── controllers/          # Thin — validate input, call service, return response
│   ├── authController.ts
│   ├── feedbackController.ts
│   └── analysisController.ts
├── services/             # All business logic lives here
│   ├── geminiService.ts        ← All Gemini API calls + model routing
│   ├── languageService.ts      ← Language detection helpers
│   ├── sentimentService.ts     ← Sentiment scoring helpers
│   ├── themeService.ts         ← Theme clustering helpers
│   ├── uploadService.ts        ← CSV/Excel parsing (multer + xlsx)
│   └── reportService.ts        ← Report generation + PDF export
├── routes/               # Express router definitions only — no logic
│   ├── authRoutes.ts
│   ├── feedbackRoutes.ts
│   └── analysisRoutes.ts
├── middlewares/
│   ├── authMiddleware.ts       ← JWT verification
│   ├── errorHandler.ts         ← Global error handler
│   └── uploadMiddleware.ts     ← Multer config
├── validators/           # Zod schemas — one file per domain
│   ├── authValidator.ts
│   └── feedbackValidator.ts
├── utils/
│   ├── logger.ts               ← Structured logger
│   ├── catchAsync.ts           ← Wraps async route handlers
│   ├── AppError.ts             ← Operational error class
│   └── pdfExport.ts
├── lib/
│   └── prisma.ts               ← Shared PrismaClient singleton (adapter-pg)
├── config/
│   └── env.ts                  ← Validated env vars via Zod
├── app.ts                      ← Express app setup, middleware registration
└── server.ts                   ← Entry point — binds port, starts server

prisma/
├── schema.prisma               ← No url field (Prisma 7 — moved to prisma.config.ts)
└── migrations/

prisma.config.ts                ← Prisma 7 CLI config (datasource url + dotenv)
eval/
└── gold-set.json               ← 200-example hand-labeled evaluation set
```

---

## Coding Conventions

### Naming

- **Files:** camelCase (`geminiService.ts`, `authController.ts`)
- **Functions:** camelCase (`submitFeedback`, `analyzeText`)
- **Types/Interfaces:** PascalCase (`FeedbackAnalysis`, `UserPayload`)
- **Zod schemas:** PascalCase with `Schema` suffix (`FeedbackSubmitSchema`)
- **Constants:** `UPPER_SNAKE_CASE` (`MAX_BATCH_SIZE`)
- **Routes prefix:** `/api/v1/`

### Service Layer Rules

All business logic lives in service files — controllers must not contain logic.

Service functions are exported individually — **no `Service` suffix** on exported function names:

```typescript
// ✅ Correct
export async function analyzeFeedback(text: string) { ... }

// ❌ Wrong
export const FeedbackService = { analyzeFeedback: async () => {} }
```

Services never import from controllers — dependency only flows downward.

### Logging Format

All log messages use `[FunctionName] -> Message` format:

```typescript
console.log('[analyzeFeedback] -> Starting analysis for feedbackId:', id);
console.error('[analyzeFeedback] -> Gemini API call failed:', error.message);
```

### Error Handling

- All async route handlers are wrapped with the `catchAsync` utility (`src/utils/catchAsync.ts`)
- Business errors are thrown as `AppError` class instances (`src/utils/AppError.ts`)
- The global `errorHandler` middleware in `middlewares/errorHandler.ts` catches all errors
- **Never leak stack traces to API responses** — only in server logs

### TypeScript

- Use `import type` for type-only imports (e.g., `import type { Request, Response } from 'express'`)
- All function parameters and return types must be explicitly typed
- **No `any`** — use `unknown` and narrow with type guards
- Use Zod `.parse()` in validators, not `.safeParse()` (error handler catches thrown errors)

### Validation

- Every request body validated by a Zod schema at controller boundary before touching services
- Schemas live in `src/validators/` — imported into controllers
- Feedback text: max 5,000 characters
- Batch endpoint: max 100 items per request
- File upload: max 10MB, only `.csv`, `.xlsx`, `.xls`

---

## Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | Yes | — | `development` or `production` |
| `PORT` | No | `3000` | Server port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Min 32 characters |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiry |
| `GEMINI_API_KEY` | Yes | — | From aistudio.google.com |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Primary model |
| `LOG_LEVEL` | No | `info` | `info`, `debug`, `error` |

All env vars are validated on startup via Zod in `src/config/env.ts`. The server will not start if required vars are missing.

---

## Database Schema (Prisma)

**Note:** This project uses **Prisma 7**. The `url` field is NOT in `schema.prisma` — it lives in `prisma.config.ts`. The PrismaClient uses `@prisma/adapter-pg` for direct PostgreSQL connections.

Four models: `User → Project → Feedback → Analysis` (1:1 on the last link)

Key fields on `Analysis`:
- `detectedLang` — `tamil | sinhala | english | tanglish | singlish | mixed_other | unknown`
- `script` — `tamil_native | sinhala_native | latin | mixed`
- `sentiment` — `positive | negative | neutral | mixed`
- `confidence` — Float 0.0–1.0 (values < 0.6 trigger retry on Gemini Pro)
- `themes` — String array: `service | price | quality | delivery | staff | food | app_ux | billing | other`
- `isSarcastic` — Boolean (sarcasm reverses stored sentiment to intended polarity)
- `containsCodeMix` — Boolean (for language-mix dashboard breakdowns)

When modifying the schema, always run `npx prisma generate` immediately after.

---

## Gemini Integration

### Model Routing (`geminiService.ts`)

```
Request
  ├─► Gemini 2.5 Flash      (default)
  │     └─► 429 error → Gemini 2.5 Flash-Lite  (fallback)
  └─► confidence < 0.6 → Gemini 2.5 Pro        (retry)
```

### Single Structured Call

One Gemini call produces all six outputs simultaneously:
`detected_language + script + sentiment + confidence + themes + is_sarcastic + contains_code_mix + rationale`

Use `response_mime_type: "application/json"` with the Zod schema shape.

### Gemini Config

- `temperature: 0.1` — low for consistent classification
- `thinkingBudget: 0` — disable extended thinking on Flash (cost saving)
- `safetySettings: BLOCK_ONLY_HIGH` — prevents over-blocking on low-resource language content
- **Do NOT translate text before sending** — pass raw text including Singlish/Tanglish as-is

### System Prompt Key Rules

1. Do not translate — classify holistically
2. Code-mixed text: set `contains_code_mix = true`
3. Sarcasm: set `is_sarcastic = true` and report INTENDED sentiment
4. Output JSON only — no prose outside the schema

---

## API Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login

POST   /api/v1/projects
GET    /api/v1/projects

POST   /api/v1/feedback/submit          ← single feedback
POST   /api/v1/feedback/batch           ← array, max 100
POST   /api/v1/feedback/upload          ← CSV/Excel file

GET    /api/v1/analysis/report/:id
GET    /api/v1/analysis/sentiment/:id
GET    /api/v1/analysis/themes/:id
GET    /api/v1/analysis/export/:id      ← PDF or JSON
GET    /health
```

### Rate Limits

| Scope | Limit |
|---|---|
| Global (per IP) | 100 req/min |
| Auth endpoints | 5 req/15 min |
| Feedback submission (per user) | 60 req/min |

---

## Testing

- **Framework:** Vitest
- **Test files:** `*.test.ts` in `tests/` directory
- **Hand-labeled evaluation set for AI accuracy:** `eval/gold-set.json` (200 examples)
- Before running tests, ensure `.env.test` is configured with a separate test database

---

## Do Not

- Do not put business logic in controllers or routes
- Do not commit `.env` — only `.env.example`
- Do not use `any` in TypeScript
- Do not use unicode bullet characters in string literals
- Do not translate feedback text before sending to Gemini
- Do not call Gemini with `thinkingBudget > 0` on Flash (expensive)
- Do not expose stack traces in API error responses
- Do not add the `Service` suffix to exported service function names

---

## Common Tasks

### Add a new endpoint

1. Create Zod schema in `src/validators/`
2. Create service function in `src/services/`
3. Create controller function in `src/controllers/` — wrap with `catchAsync`, call service, return response
4. Add route in `src/routes/` — attach middleware + controller
5. Register route in `src/app.ts`

### Add a new Prisma model

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name describe_change`
3. Run `npx prisma generate`
4. Import updated types in affected service files

### Update Gemini prompt

1. Edit system prompt string in `src/services/geminiService.ts`
2. Run the evaluation script against `eval/gold-set.json` to check for regression
3. Log the change in a commit message with date and reason
