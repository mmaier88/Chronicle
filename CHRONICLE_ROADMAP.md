# Chronicle Implementation Roadmap

**Pivot Date:** 2025-12-17
**Status:** ✅ COMPLETE

---

## Deployment

**Platform:** Vercel (only)
**Database:** Supabase (`ambrhrajlgogvfysztrw`)

---

## Implementation Summary

Chronicle is an AI-native book writing system. All phases complete.

---

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

## Out of Scope (V1)

- Screenplays
- Multi-author collaboration
- Public sharing
- Publishing integrations
- Mobile app
