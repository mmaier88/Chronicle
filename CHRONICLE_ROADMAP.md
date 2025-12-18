# Chronicle Implementation Roadmap

**Pivot Date:** 2025-12-17
**Status:** Author Flow ✅ COMPLETE | Vibe Flow ✅ COMPLETE

---

## Deployment

**Platform:** Vercel (only)
**Database:** Supabase (`ambrhrajlgogvfysztrw`)

---

## Implementation Summary

Chronicle is an AI-native book writing system with two flows:
1. **Author Flow** - Full control for serious writers (complete)
2. **Vibe Flow** - One-click book generation for readers (new)

---

# AUTHOR FLOW (V1) ✅

## Phase 1: Foundation Reset ✅

- [x] Database schema (books, chapters, sections, milestones, embeddings)
- [x] Tiptap schema with custom nodes
- [x] Project setup and cleanup

---

## Phase 2: Core Book Structure ✅

- [x] Book creation flow with genre selection
- [x] Constitution editor with all 7 fields
- [x] Lock mechanism (gates chapter creation)
- [x] Chapter scaffold with meta fields
- [x] Section planning

---

## Phase 3: Editor & Writing ✅

- [x] Custom TipTap nodes: `claim_block`, `motif_block`, `thread_block`, `note_block`
- [x] AI generation pipeline (`/api/ai/generate`)
- [x] Draft/canonical system with visual distinction
- [x] Section writing flow with AI assistance

---

## Phase 4: Memory & Embeddings ✅

- [x] Embedding endpoint (`/api/embed`) using Voyage AI
- [x] Only canonical sections get embedded
- [x] Milestone-based embedding (v1, v2, final)
- [x] Chunking strategy (600-1200 tokens, ~100 overlap)

---

## Phase 5: Consistency & Finalization ✅

- [x] Consistency check endpoint (`/api/ai/consistency`)
- [x] Contradiction detection
- [x] Tone drift analysis
- [x] Constitution violation detection
- [x] Chapter lock endpoint
- [x] Section promote endpoint

---

## Phase 6: UI Layout ✅

- [x] Dashboard layout with navigation
- [x] Book list and creation
- [x] Book detail with Constitution editor
- [x] Chapter detail with sections
- [x] Section editor with toolbar and AI buttons
- [x] Status indicators (draft/canonical/locked)

---

# VIBE FLOW (V2) 🚧

**Goal:** Consumer-facing "Vibe a Book" flow. User picks genre + prompt, gets a ~30-page book generated automatically. No spoilers, no manual editing required.

**Target:** ~7,500-9,500 words (6-8 chapters, 1-3 sections each)

---

## Phase 7: Vibe Data Model ✅

- [x] Add `source` field to `books` table (`'author' | 'vibe'`)
- [x] Create `vibe_jobs` table (migration in `supabase/migrations/00002_vibe_flow.sql`)
  - id, user_id, book_id
  - genre, user_prompt, preview (jsonb)
  - status (queued|running|failed|complete)
  - step, progress (0-100)
  - story_synopsis (running context)
  - error, attempt, timestamps
- [x] Add TypeScript types for vibe entities

---

## Phase 8: Preview Generation ✅

- [x] `POST /api/vibe/preview` endpoint
  - Input: genre, prompt
  - Output: title, logline, blurb, cast, setting, promise, warnings
  - Strict JSON schema, retry on invalid
  - Spoiler-light (no twists revealed)
- [x] Preview regeneration with constraints ("Improve" button)
- [x] IP-name guardrails (block copyrighted franchise requests)

---

## Phase 9: Vibe Job Orchestration ✅

- [x] `POST /api/vibe/job` - Create job + book shell
- [x] `POST /api/vibe/job/[jobId]/tick` - Chunked progression
  - Each tick: write 1 section → consistency check → promote → update progress
  - Avoids Vercel 60s timeout
  - Max 3 retries per section with rewrite loop
- [x] `GET /api/vibe/job/[jobId]/status` - Progress polling
- [x] Auto-constitution generation from preview
- [x] Chapter/section plan generation (~30 pages)
- [x] Story synopsis maintenance (running context between sections)
- [x] Content warnings in preview (generation prompt wiring pending)

---

## Phase 10: Vibe UI ✅

- [x] `/vibe` - Landing page with "Vibe a Book" CTA
- [x] `/vibe/new` - Genre picker + prompt input
- [x] `/vibe/preview` - Editable preview (title, blurb, cast, etc.)
  - Improve button (AI rewrite with constraints)
  - Regenerate button (new variant)
  - localStorage backup for refresh recovery
- [x] `/vibe/generating/[jobId]` - Progress view
  - Polls status endpoint
  - Shows current step + percentage
  - Error display with retry option
- [x] `/vibe/read/[bookId]` - Reader view
  - Clean, minimal chrome
  - Table of contents
  - Continuous reading mode
  - "Generated for you" badge

---

## Phase 11: Vibe Guardrails & Polish ✅

- [x] Rate limiting (5 jobs per user per day)
- [x] Resume capability for failed jobs (via tick endpoint)
- [x] Content moderation on prompts (IP guardrails)
- [x] Error recovery UX (retry from failure point)
- [ ] Analytics: vibe vs author book tracking (future)

---

## API Endpoints

| Endpoint | Status |
|----------|--------|
| `POST /api/ai/generate` | ✅ |
| `POST /api/ai/extract` | ✅ |
| `POST /api/ai/consistency` | ✅ |
| `POST /api/embed` | ✅ |
| `POST /api/books/[id]/constitution/lock` | ✅ |
| `POST /api/books/[id]/chapters/[chId]/lock` | ✅ |
| `POST /api/books/[id]/chapters/[chId]/sections/[sId]/promote` | ✅ |
| `POST /api/vibe/preview` | ✅ |
| `POST /api/vibe/job` | ✅ |
| `POST /api/vibe/job/[jobId]/tick` | ✅ |
| `GET /api/vibe/job/[jobId]/status` | ✅ |

---

## Environment Variables (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
VOYAGE_API_KEY
```

---

## Out of Scope (V2)

- Screenplays / movie generation
- Multi-author collaboration
- Public sharing / publishing integrations
- Mobile app
- Full-length novels (>30 pages)
- Payment gating
- Export to PDF/EPUB
