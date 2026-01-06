# Chronicle Autonomous Narrative Engine - Implementation Roadmap

**Created:** 2026-01-06
**Target Server:** Hetzner CX42 (138.199.231.3)
**Status:** IMPLEMENTING

---

## Critical Assessment of the Plan

### Strengths
1. **Clear separation of concerns** - Writer generates, Editor enforces discipline, Validator gates
2. **No embeddings approach** - Fingerprints are deterministic, fast, and debuggable
3. **Checkpoint system** - Enables resumability and debugging
4. **Act-based structure** - Matches traditional story architecture

### Risks & Mitigations
1. **LLM JSON reliability** - Mitigate with Zod validation + repair loops
2. **Context window limits** - Use summaries, never feed full manuscript
3. **Editor infinite loops** - Hard cap at 3 regenerations per scene
4. **Token costs for long books** - Budget ~$50-100 per 60k-word book (Claude Sonnet)

### Scope Adjustments
- **V1 Target:** 25k-word books (3 acts, ~20 chapters)
- **Defer:** 90k-word novels, multiple endings, user preferences
- **Simplify:** Single LLM provider (Anthropic) initially, add OpenAI later

---

## Phase 1: Foundation (Days 1-2)

### 1.1 Monorepo Structure
```
chronicle-engine/
├── apps/
│   ├── api/           # Express/Hono HTTP server
│   └── worker/        # BullMQ job processor
├── packages/
│   └── core/          # Shared types, schemas, agents
├── prisma/            # Database schema
├── infra/             # Docker, Caddy config
└── package.json       # Workspace root
```

### 1.2 Core Schemas (packages/core)
- [x] NarrativeState (Zod + TypeScript)
- [x] SceneFingerprint (Zod + TypeScript)
- [x] Job status types
- [x] API request/response types

### 1.3 Database (Prisma)
- [x] book_jobs table
- [x] narrative_checkpoints table
- [x] manuscripts table

---

## Phase 2: LLM Infrastructure (Day 2)

### 2.1 LLM Client Wrapper
- [x] Anthropic Claude integration
- [x] JSON mode with Zod validation
- [x] Retry with exponential backoff
- [x] Token budget tracking
- [x] Structured logging (job_id, scene_id)

### 2.2 Prompt Templates
- [x] Writer system prompt (creative, blind to redundancy)
- [x] Editor system prompt (ruthless, discipline-focused)
- [x] Validator system prompt (structural checks)
- [x] Fingerprint extraction prompt

---

## Phase 3: Agents & Fingerprints (Days 2-3)

### 3.1 Fingerprint System
- [x] SceneFingerprint extraction via LLM
- [x] String normalization (lowercase, stopwords, punctuation)
- [x] Jaccard similarity for duplicate detection (>0.65 = duplicate)
- [x] Sliding window of last 20 fingerprints

### 3.2 Writer Agent
- [x] Input: NarrativeState + scene brief
- [x] Output: Raw scene (1.5-2.5k words) + metadata
- [x] Style constraints injection (genre, voice)

### 3.3 Editor Agent
- [x] Extract fingerprint from raw scene
- [x] Check: state mutation required
- [x] Check: redundancy/function repetition
- [x] Check: escalation/consequence
- [x] Decide: ACCEPT | REWRITE | MERGE | REGENERATE | DROP
- [x] Output: Tightened scene + NarrativeState patch

### 3.4 Validator Agent
- [x] Act validation (goals, closure conditions)
- [x] Book validation (thesis, protagonist loss, escalation budget)
- [x] Failure instructions for regeneration

---

## Phase 4: Orchestrator Loop (Days 3-4)

### 4.1 Job Initialization
- [x] Parse user input (prompt, genre, target length)
- [x] Derive theme_thesis
- [x] Calculate act structure (3 or 5 acts)
- [x] Set escalation budget

### 4.2 Act Loop
- [x] Set act goals and closure conditions
- [x] Scene generation loop (Writer → Editor)
- [x] Chapter assembly at boundaries
- [x] Checkpoint after each accepted scene
- [x] Act validation at act end

### 4.3 Final Pass
- [x] Whole-book compression pass
- [x] Final validation
- [x] Manuscript assembly and storage

### 4.4 Error Handling
- [x] Max 3 regeneration attempts per scene
- [x] Max 2 act-tail regenerations
- [x] Graceful failure with checkpoint preservation

---

## Phase 5: API & Infrastructure (Day 4)

### 5.1 API Endpoints
- [x] `POST /v1/books` - Create job
- [x] `GET /v1/books/:id` - Get status
- [x] `GET /v1/books/:id/manuscript` - Get final output
- [x] `GET /health` - Health check

### 5.2 Docker Compose
- [x] api service (port 3000)
- [x] worker service (no public port)
- [x] postgres service (volume)
- [x] redis service (volume)
- [x] caddy reverse proxy (TLS)

### 5.3 Server Deployment
- [x] Firewall (ufw: 22, 80, 443 only)
- [x] Deploy to /opt/chronicle-engine
- [x] docker compose up -d
- [x] Health check verification

---

## Phase 6: Testing & Polish (Day 5)

### 6.1 End-to-End Test
- [ ] Generate 25k-word test book
- [ ] Verify fingerprint deduplication works
- [ ] Verify checkpoints enable resumability
- [ ] Verify final manuscript quality

### 6.2 Monitoring
- [ ] Structured JSON logs
- [ ] Job progress tracking
- [ ] Basic error alerting

---

## Default Parameters (V1)

| Parameter | Value |
|-----------|-------|
| acts_total (<=35k words) | 3 |
| acts_total (35k-90k words) | 5 |
| scene_raw_words | 1500-2500 |
| scene_edited_words | 1000-1800 |
| redundancy_window | 20 fingerprints |
| jaccard_threshold | 0.65 |
| regenerate_attempts | 3 per scene |
| act_tail_regenerate | 15% of act |
| final_tail_regenerate | 20% of book |
| escalation_budget | max(8, target_words/2500) |

---

## File Structure (Final)

```
chronicle-engine/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── books.ts
│   │   │   │   └── health.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   └── worker/
│       ├── src/
│       │   ├── orchestrator.ts
│       │   ├── jobs/
│       │   │   └── generate-book.ts
│       │   └── index.ts
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── core/
│       ├── src/
│       │   ├── narrative/
│       │   │   ├── state.ts
│       │   │   └── fingerprint.ts
│       │   ├── agents/
│       │   │   ├── writer.ts
│       │   │   ├── editor.ts
│       │   │   └── validator.ts
│       │   ├── llm/
│       │   │   ├── client.ts
│       │   │   └── prompts.ts
│       │   ├── storage/
│       │   │   └── postgres.ts
│       │   └── index.ts
│       └── package.json
├── prisma/
│   └── schema.prisma
├── infra/
│   ├── docker-compose.yml
│   └── Caddyfile
├── package.json
├── tsconfig.json
└── README.md
```

---

## Key Principle

> **"A shorter scarred book beats a longer safe one."**

The Editor Agent is the authority. Discipline over richness. Always.
