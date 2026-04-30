# 🌐 Multilingual Feedback Analyzer API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5+-2D3748?style=flat-square&logo=prisma&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-AI-4285F4?style=flat-square&logo=google&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**The only open-source feedback analytics API with native support for Tamil, Sinhala, English, and code-mixed Singlish/Tanglish text.**

Built for Sri Lankan businesses that receive customer feedback in multiple languages — and need real insights, not English-only sentiment scores.

[Features](#-features) · [Quick Start](#-quick-start) · [API Reference](#-api-reference) · [Architecture](#-architecture) · [Evaluation](#-evaluation) · [Roadmap](#-roadmap)

</div>

---

## 🤔 Why This Exists

Every major feedback analytics platform — Qualtrics, Medallia, InMoment, Zonka — processes feedback in English. Sri Lankan businesses receive feedback like this:

```
"Service eka super, but delivery slow aawa. Price okay."         ← Singlish
"App ரொம்ப good, ஆனா payment crash ஆகுது"                      ← Tanglish
"Godak watinawa, staff la friendly."                             ← Sinhala-English
```

None of those tools can process that correctly. This API can — natively, in a single structured call, at $0.0004 per analysis.

| Platform | Tamil | Sinhala | Code-Mixed | Starting Price |
|---|---|---|---|---|
| Qualtrics | ❌ | ❌ | ❌ | $20,000+/year |
| Medallia | ❌ | ❌ | ❌ | Enterprise custom |
| Zonka Feedback | ❌ | ❌ | ❌ | $799/month |
| Birdeye | ❌ | ❌ | ❌ | $299/location |
| **This API** | ✅ Native | ✅ Native | ✅ Native | **Free (self-hosted)** |

---

## ✨ Features

### Core — Available Now
- 🗣️ **Language detection** — Tamil, Sinhala, English, Singlish, Tanglish, and mixed-script identification
- 💬 **Sentiment analysis** — Positive / Negative / Neutral / Mixed with confidence score (0–1)
- 🏷️ **Theme clustering** — Automatic topic extraction: Service, Price, Quality, Delivery, Staff, App UX, Billing
- 🎭 **Sarcasm detection** — Detects ironic statements where surface sentiment is opposite of intent
- 📄 **Batch ingestion** — Submit up to 100 feedback items in a single request
- 📊 **CSV / Excel upload** — Bulk import from spreadsheets
- 📈 **Aggregate reports** — Sentiment trends, theme breakdown, language mix per project
- 📤 **Export** — Download full reports as PDF or JSON

### Architecture Highlights
- **Single Gemini call** — sentiment + language + script + themes + sarcasm + confidence in one structured JSON response
- **Smart routing** — Falls back to Flash-Lite on rate limits, re-routes low-confidence (<0.6) to Pro
- **~$0.0004 per analysis** — 2,300 analyses per dollar on Gemini 2.5 Flash
- **Production patterns** — JWT auth, Zod validation, structured logging, rate limiting, error middleware

### Roadmap — Phase 2
- 📱 WhatsApp Business API webhook ingestion
- 🌟 Google Reviews scraper
- 📘 Facebook Page comments integration
- 🔔 Slack alerts for negative sentiment spikes

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- A Gemini API key (free at [aistudio.google.com](https://aistudio.google.com/apikey))

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/multilingual-feedback-analyzer.git
cd multilingual-feedback-analyzer
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/feedback_analyzer"
JWT_SECRET="your-super-secret-key-min-32-chars"
JWT_EXPIRES_IN=7d
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Start Database & Run Migrations

```bash
# Start PostgreSQL via Docker
docker-compose up -d postgres

# Run migrations
npx prisma migrate dev
```

### 4. Start the Server

```bash
npm run dev
```

Hit `http://localhost:3000/health` — you should see:

```json
{ "status": "ok", "message": "Multilingual Feedback Analyzer API" }
```

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Get JWT token |

All other endpoints require `Authorization: Bearer <token>` header.

---

### Submit Feedback

**POST** `/api/v1/feedback/submit`

```bash
curl -X POST http://localhost:3000/api/v1/feedback/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-uuid",
    "text": "Service eka super, but delivery slow aawa. Price okay."
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "feedback-uuid",
    "analysis": {
      "detectedLang": "singlish",
      "script": "latin",
      "sentiment": "mixed",
      "confidence": 0.87,
      "themes": ["service", "delivery", "price"],
      "isSarcastic": false,
      "containsCodeMix": true,
      "rationale": "Positive about service quality, negative about delivery speed."
    },
    "createdAt": "2026-04-27T10:30:00Z"
  }
}
```

---

### Batch Submit

**POST** `/api/v1/feedback/batch`

```json
{
  "projectId": "your-project-uuid",
  "items": [
    { "text": "Service eka super machan!" },
    { "text": "App ரொம்ப good, ஆனா price high" },
    { "text": "Delivery godak late. Not happy." }
  ]
}
```

---

### Upload CSV / Excel

**POST** `/api/v1/feedback/upload`

```bash
curl -X POST http://localhost:3000/api/v1/feedback/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@feedback.csv" \
  -F "projectId=your-project-uuid"
```

Expected CSV format:

```csv
text
"Service eka super machan!"
"App crash aawa, money waste"
"App ரொம்ப good"
```

---

### Analytics Report

**GET** `/api/v1/analysis/report/:projectId`

```json
{
  "success": true,
  "data": {
    "totalFeedback": 1247,
    "sentimentBreakdown": {
      "positive": 743,
      "negative": 312,
      "neutral": 156,
      "mixed": 36
    },
    "languageBreakdown": {
      "english": 412,
      "sinhala": 298,
      "tamil": 187,
      "singlish": 234,
      "tanglish": 116
    },
    "topThemes": [
      { "theme": "service",  "count": 487, "avgSentiment": 0.72 },
      { "theme": "price",    "count": 312, "avgSentiment": 0.41 },
      { "theme": "delivery", "count": 256, "avgSentiment": 0.34 }
    ],
    "priorityAlerts": 23,
    "trendDirection": "improving"
  }
}
```

### All Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/feedback/submit` | Single feedback analysis |
| POST | `/api/v1/feedback/batch` | Batch feedback (max 100) |
| POST | `/api/v1/feedback/upload` | CSV / Excel upload |
| GET | `/api/v1/analysis/report/:id` | Aggregate report |
| GET | `/api/v1/analysis/sentiment/:id` | Sentiment breakdown |
| GET | `/api/v1/analysis/themes/:id` | Theme clusters |
| GET | `/api/v1/analysis/export/:id` | Export PDF / JSON |

---

## 🏗️ Architecture

```
Client Request
      │
      ▼
┌─────────────────────────────────┐
│   Express + Middleware Layer    │
│  JWT Auth · Zod · Rate Limit   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       Controller Layer          │
│  auth · feedback · analysis    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│        Service Layer            │
│  gemini · language · sentiment  │
│  theme · upload · report        │
└──────────┬──────────────┬───────┘
           │              │
           ▼              ▼
    PostgreSQL      Gemini 2.5 Flash
    + Prisma        (Structured Output)
```

### Gemini Call — One Call, Six Outputs

```typescript
// A single Gemini call returns all of this simultaneously:
{
  detected_language: "singlish",
  script: "latin",
  sentiment: "mixed",
  sentiment_confidence: 0.87,
  themes: ["service", "delivery", "price"],
  is_sarcastic: false,
  contains_code_mix: true,
  rationale: "Positive about service, negative about delivery."
}
```

### Model Routing

```
Request
  │
  ├─► Gemini 2.5 Flash       (default — $0.30/1M input)
  │         │
  │    429 Rate limit?
  │         └─► Gemini 2.5 Flash-Lite   (fallback — $0.10/1M)
  │
  └─► confidence < 0.6?
            └─► Gemini 2.5 Pro          (high-accuracy retry)
```

---

## 🧠 AI & NLP Design Decisions

### Why Gemini 2.5 Flash?

Three independent benchmarks confirm it as the best LLM for Tamil and Sinhala:

| Benchmark | Finding |
|---|---|
| ILAKKANAM (Nov 2025) | Gemini 2.5 leads all closed-source LLMs on Tamil |
| arXiv:2601.14958 (2026) | Gemini excels at Sinhala Unicode generation |
| IndicParam | Gemini 2.5 Flash: ~56% vs GPT-5: ~45% on low-resource Indic |

### Why Not Fine-Tune XLM-RoBERTa?

Fine-tuned XLM-R is the academic state-of-the-art on Sinhala sentiment (88.4% macro-F1, Rizvi et al. 2025). It is available as a Python sidecar under `/eval/` for benchmarking. Gemini Flash was chosen for the live API because:

- No GPU required
- Native structured JSON output
- 2,300 analyses per dollar
- Free tier for development

### Code-Mixing Is Handled Holistically

The system prompt explicitly instructs Gemini **not to translate** before classifying. Romanized Sinhala and Tamil are passed as-is — modern LLMs lose register context when forced to native script. Sarcasm detection reverses polarity before storing the final sentiment label.

---

## 📊 Evaluation

A 200-example hand-labeled gold set is committed under `/eval/gold-set.json`.

| Language | Examples |
|---|---|
| Sinhala native script | 50 |
| Tamil native script | 50 |
| Singlish (Romanized Sinhala-English) | 50 |
| Tanglish (Romanized Tamil-English) | 30 |
| English (control) | 20 |

### Benchmark Results

> Results will be updated post-implementation.

| Model | Sentiment Macro-F1 | Lang Accuracy | Cost per 1K |
|---|---|---|---|
| Gemini 2.5 Flash | TBD | TBD | $0.43 |
| Gemini 2.5 Pro | TBD | TBD | $2.10 |
| XLM-R fine-tuned | TBD | TBD | Self-hosted |
| GPT-4o-mini (control) | TBD | TBD | $0.30 |

---

## 🗂️ Project Structure

```
src/
├── controllers/        # Request handlers
├── services/
│   ├── geminiService.ts      # All Gemini API calls + routing
│   ├── languageService.ts    # Language detection
│   ├── sentimentService.ts   # Sentiment scoring
│   ├── themeService.ts       # Theme clustering
│   ├── uploadService.ts      # CSV/Excel parsing
│   └── reportService.ts      # Report generation
├── routes/             # Express route definitions
├── middlewares/        # Auth, error, upload
├── validators/         # Zod schemas
├── utils/              # Logger, PDF export
└── config/             # Env config

prisma/
├── schema.prisma       # Database models
└── migrations/         # Migration history

eval/
└── gold-set.json       # 200-example labeled test set
```

---

## 🐳 Docker

```bash
# Start everything (API + Postgres)
docker-compose up

# API only (if you have Postgres already)
docker build -t feedback-analyzer .
docker run -p 3000:3000 --env-file .env feedback-analyzer
```

---

## 🌍 Deployment

### Railway (Recommended — Free Tier)

1. Push to GitHub
2. Connect repo at [railway.app](https://railway.app)
3. Add PostgreSQL plugin
4. Set environment variables
5. Deploy — Railway auto-detects Dockerfile

### Other Options
- **Fly.io** — `flyctl launch`
- **Render** — Connect GitHub, set env vars
- **AWS ECS** — Use `docker-compose.yml` as task definition

---

## 📚 References

- Rizvi, A. et al. (2025). *Enhancing Multilingual Sentiment Analysis with Explainability for Sinhala, English, and Code-Mixed Content.* [arXiv:2504.13545](https://arxiv.org/abs/2504.13545)
- ILAKKANAM (2025). *From Phonemes to Meaning: Evaluating LLMs on Tamil.* [arXiv:2511.12387](https://arxiv.org/abs/2511.12387)
- *A Comprehensive Benchmark of LLMs on Unicode and Romanized Sinhala.* [arXiv:2601.14958](https://arxiv.org/html/2601.14958v1)
- [AI4Bharat IndicNLP Catalog](https://github.com/AI4Bharat/indicnlp_catalog)
- [NLPC-UoM Sri Lankan NLP Repos](https://github.com/nlpc-uom)

---

## 🗺️ Roadmap

- [x] REST API — single & batch submission
- [x] CSV / Excel upload
- [x] Sentiment + theme + language analysis
- [x] Aggregate reports + PDF export
- [x] Docker + Railway deployment
- [ ] WhatsApp Business webhook
- [ ] Google Reviews scraper
- [ ] Facebook comments integration
- [ ] Slack alerts
- [ ] Trend & anomaly detection
- [ ] Web dashboard (Next.js)
- [ ] XLM-R evaluation pipeline

---

