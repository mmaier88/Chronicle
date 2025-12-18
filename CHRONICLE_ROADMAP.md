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

## Phase 12: Prose Quality (De-AI-ification) 🚧

**Goal:** Make generated prose feel authored by a real human, not an AI.

### Voice & Style Rules

- [x] Literary but grounded voice
- [x] Concrete sensory imagery over abstract nouns
- [x] Dynamic variance in sentence rhythm
- [x] End scenes on action/image, not moral conclusions

### Dialogue Rules

- [x] Every line carries subtext (hidden agenda)
- [x] Include micro-pauses, interruptions, non-verbal cues
- [x] Contradiction between words and action

### Quality Checks (Built into prompts)

- [x] Sensory detail every paragraph (visual, sound, texture, smell, kinesthetic)
- [x] Emotional complexity: character thoughts contain contradiction/uncertainty
- [x] Character agency: hidden agendas drive choices
- [x] No "thesis endings" (moral conclusions at paragraph/scene ends)

### Revision Workflow (Multi-pass)

- [x] Pass 1: Sensory enrichment
- [x] Pass 2: Dialogue subtext injection
- [x] Pass 3: Scene shape (action/image endings)
- [x] Pass 4: Rhythm tuning (short beats, fragments)
- [x] Pass 5: Cut restated thematic conclusions

### Implementation

- [x] `lib/prose-guidelines.ts` - Centralized prose writing prompts
- [x] Updated `/api/vibe/job/[jobId]/tick` with humanization rules
- [x] Updated `/api/ai/generate` for author mode

---

## Phase 13: Last 10% Literary Polish Pipeline 🚧

**Goal:** Multi-pass editorial refinement to go from "very good" to "publishable / unmistakably human."

### Global Hard Rules

- [x] **G1 - Don't name the theme**: Cut "X disguised as Y", "she realized that..." (max 1 per 1200 words)
- [x] **G2 - Reduce crafted aphorisms**: Replace 70% of TED-talk lines with contradiction/awkwardness
- [x] **G3 - Add controlled messiness**: 2-4 mess beats per 2500-4000 words (petty impulse, defensive lie, misread)
- [x] **G4 - Trim 10-15%**: Cut reiteration, redundant metaphors, internal explanation

### Detection Heuristics (Smell Pass)

- [x] **H1 - Theme-label sentences**: Flag "X disguised as Y", "It wasn't A. It was B."
- [x] **H2 - Over-clean metaphor chains**: Flag 3+ metaphors resolving too neatly
- [x] **H3 - Character coherence problem**: Flag always-calm, always-reasonable characters
- [x] **H4 - Duplicate setup paragraphs**: Flag restated emotions
- [x] **H5 - Motif overuse**: Count per 1000 words, flag if >6

### 7-Pass Editorial Pipeline

- [x] **Pass 1 - Structural Tightening**: Remove pre-turn padding, fix scene endings
- [x] **Pass 2 - Line Restraint**: Roughen 40%+ of "crafted" sentences
- [x] **Pass 3 - Dialogue Subtext**: Add misfires, interruptions, physical action
- [x] **Pass 4 - Character Mess Beats**: Inject 2-4 imperfections per section
- [x] **Pass 5 - Motif Governance**: Limit motif density, ensure transformation not looping
- [x] **Pass 6 - Anti-Aphorism Sweep**: Replace quotable lines with scene detail + silence
- [x] **Pass 7 - Rhythm Pass**: Ensure varied sentence lengths per page

### Rewrite Patterns

- [x] **P1 - Replace "She realized..."**: Show via action (hand stops, cup clinks, body reacts first)
- [x] **P2 - Remove "X disguised as Y"**: Replace with image + unspoken reaction + contradiction
- [x] **P3 - Character flaws**: Add assumptions, slightly selfish lines, too-quick solutions

### Implementation

- [x] `lib/polish-pipeline.ts` - Multi-pass refinement prompts
- [x] `POST /api/ai/polish` - Polish endpoint for section refinement
- [x] Integrated polish pass into `/api/vibe/job/[jobId]/tick` after initial write

---

## API Endpoints

| Endpoint | Status |
|----------|--------|
| `POST /api/ai/generate` | ✅ |
| `POST /api/ai/extract` | ✅ |
| `POST /api/ai/consistency` | ✅ |
| `POST /api/ai/polish` | ✅ |
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
