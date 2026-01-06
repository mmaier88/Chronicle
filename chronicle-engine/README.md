# Chronicle Autonomous Narrative Engine

A fully autonomous book generation system that produces long-form novels (25k-90k words) without user intervention.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API       │────▶│   Queue     │
│             │     │  (Express)  │     │  (BullMQ)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Postgres   │◀────│   Worker    │────▶│   Claude    │
│  (State)    │     │ (Orchestr.) │     │   (LLM)     │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Core Concept

**The user is NOT the writer.** Everything is fully automatic:
- Chronicle generates scenes internally
- An Editor agent enforces discipline (cuts/merges/regenerates)
- A Validator agent ensures structural integrity
- User sees only final polished output

## Key Components

### Agents
1. **Writer Agent** - Creative generation (1500-2500 words/scene)
2. **Editor Agent** - Ruthless discipline (ACCEPT/REWRITE/MERGE/REGENERATE/DROP)
3. **Validator Agent** - Structural validation at act/book boundaries

### Narrative State
A comprehensive state object tracking:
- Theme, genre, structure
- Progression metrics (mystery, clarity, intensity, velocity)
- Escalation budget (prevents endless escalation)
- Character arcs (certainty, transformation, costs, irreversible loss)
- Unresolved questions (must shrink over time)
- Fingerprint registry (for redundancy detection)

### Fingerprint-Based Deduplication
No embeddings - uses deterministic fingerprints:
- Jaccard similarity on normalized text (>0.65 = duplicate)
- Tracks narrative function, new information, consequences
- Prevents motif spam and repetitive beats

## API Endpoints

```
POST /v1/books
  Body: { prompt, genre?, target_length_words?, voice? }
  Returns: { job_id }

GET /v1/books/:id
  Returns: { status, progress, message }

GET /v1/books/:id/manuscript
  Returns: { title, blurb, content, stats }

GET /health
  Returns: { status, checks: { postgres, redis } }
```

## Deployment

### Prerequisites
- Docker & Docker Compose
- Anthropic API key

### Quick Start
```bash
cd infra
cp .env.example .env
# Edit .env with your API keys

docker compose up -d
```

### Environment Variables
- `POSTGRES_PASSWORD` - Database password
- `CHRONICLE_API_KEY` - API authentication key
- `ANTHROPIC_API_KEY` - Claude API key
- `ANTHROPIC_MODEL` - Model to use (default: claude-sonnet-4-20250514)

## Default Parameters

| Parameter | Value |
|-----------|-------|
| Acts (<=35k words) | 3 |
| Acts (35k-90k words) | 5 |
| Scene raw words | 1500-2500 |
| Scene edited words | 1000-1800 |
| Redundancy window | 20 fingerprints |
| Jaccard threshold | 0.65 |
| Max regenerations | 3 per scene |

## Quality Principle

> **"A shorter scarred book beats a longer safe one."**

The Editor Agent is the authority. Discipline over richness. Always.

## License

Proprietary - All rights reserved.
