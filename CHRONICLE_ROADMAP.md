# Chronicle Implementation Roadmap

**Pivot Date:** 2025-12-17
**Status:** ✅ COMPLETE

---

## Implementation Summary

Chronicle is an AI-native book writing system. All phases complete.

### Infrastructure
- Hetzner Server: `Chronicle` (138.199.231.3)
- Supabase Project: `ambrhrajlgogvfysztrw`
- Database: Chronicle schema applied

---

## Phase 1: Foundation Reset ✅

- [x] Database schema reset (books, chapters, sections, milestones, embeddings)
- [x] Tiptap schema with custom nodes
- [x] File cleanup - removed all ResearchBase components
- [x] Renamed to Chronicle

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

## Success Criteria

1. ✅ User can create a book with constitution
2. ✅ Constitution must be locked before chapters
3. ✅ Chapters scaffold before writing
4. ✅ Sections have draft/canonical states
5. ✅ AI generates structured output only
6. ✅ Only canonical content gets embedded
7. ✅ Consistency checks work

---

## Out of Scope (V1)

- Screenplays
- Multi-author collaboration
- Public sharing
- Publishing integrations
- Mobile app
