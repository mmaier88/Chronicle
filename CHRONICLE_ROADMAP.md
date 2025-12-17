# Chronicle Implementation Roadmap

**Pivot Date:** 2025-12-17
**From:** ResearchBase (Research document system)
**To:** Chronicle (AI-Native Book Writing System)

---

## Current State Analysis

### Infrastructure (KEEP)
- Hetzner Server: `ResearchBase` (138.199.231.3) - Will rename
- Supabase Project: `ambrhrajlgogvfysztrw` - Will reset schema
- Vercel Deployment: Will update
- Velt API: Keep for collaboration

### What We're Removing
ResearchBase was built for academic research. Chronicle is for book writing.
The following are NOT needed:

| Category | Components to Remove |
|----------|---------------------|
| Citations | `citations`, `citation_verification_runs`, CitationPanel, CitationDialog, verify endpoint |
| Sources | `sources`, `source_chunks`, PDFViewer, import endpoints (arxiv, doi, bibtex, web) |
| Knowledge Graph | `knowledge_entities`, `knowledge_relationships`, KnowledgeGraph component |
| Evidence | EvidencePanel, evidence API |
| Safety | SafetyPanel, risk_assessments table, safety API |
| Guardrails | GuardrailsPanel, guardrails API |
| Research Workflows | `workflows`, `workflow_runs`, multi-agent system |
| Claims (old) | Old claims system (replaced by claim_blocks in editor) |

### What We're Keeping (Modified)
| Component | Status |
|-----------|--------|
| Auth (Supabase) | Keep as-is |
| Tiptap Editor | Heavy modification for book schema |
| Velt Collaboration | Keep, update document context |
| Workspace Structure | Simplify for single-author books |
| Basic UI Layout | Restructure for 3-panel book editing |

---

## Phase 1: Foundation Reset (Days 1-2)

### 1.1 Database Schema Reset
Create new migration for Chronicle schema:

```
books
├── id, owner_id, title, genre, core_question
├── constitution_json (structured fields)
├── constitution_locked (boolean)
├── status (drafting | editing | final)
└── created_at, updated_at

chapters
├── id, book_id, index, title
├── purpose, central_claim, emotional_arc, failure_mode
├── dependencies[], motifs[]
├── status (draft | locked)
└── created_at, updated_at

sections
├── id, chapter_id, index, title
├── goal, local_claim, constraints
├── content_json (Tiptap ProseMirror)
├── status (draft | canonical)
└── created_at, updated_at

milestones
├── id, book_id, chapter_id, section_id
├── version (v1, v2, final)
├── content_snapshot
├── embedded (boolean)
└── created_at

embeddings
├── id, milestone_id, book_id
├── chunk_index, content
├── embedding vector(1024)
└── created_at

consistency_reports
├── id, book_id, chapter_id
├── contradictions[], tone_drift[], unresolved_threads[]
├── constitution_violations[]
└── created_at
```

### 1.2 Tiptap Schema
Define Chronicle-specific nodes:

```typescript
// Core structure
book_constitution  // Pinned, structured fields
chapter           // Container with meta
section           // Container with meta
paragraph         // Basic text

// Semantic blocks
claim_block       // claimType, stance, confidence, canonical
motif_block       // Recurring concept marker
thread_block      // Open narrative loop
note_block        // Non-embedded scratchpad
```

### 1.3 File Cleanup
- Delete all citation, source, knowledge, evidence, safety components
- Rename project references
- Update package.json name

---

## Phase 2: Core Book Structure (Days 3-5)

### 2.1 Book Creation Flow
- Create book wizard
- Genre selection (non-fiction | literary fiction)
- Core question input
- AI-generated draft constitution

### 2.2 Constitution Editor
- Structured form for all fields:
  - Central Thesis
  - Worldview/Frame
  - Narrative Voice
  - What the Book Is Against
  - What the Book Refuses to Do
  - Ideal Reader
  - Taboo Simplifications
- Lock mechanism (gates chapter creation)
- AI regeneration per field

### 2.3 Chapter Scaffold
- Generate chapter suggestions from constitution
- Chapter meta editor (purpose, claim, arc, failure mode)
- Lock individual chapters
- Dependency tracking between chapters

### 2.4 Section Planning
- Generate 3-7 sections per chapter
- Section meta (goal, local claim, constraints)
- No prose yet in this phase

---

## Phase 3: Editor & Writing (Days 6-10)

### 3.1 Tiptap Chronicle Schema
Implement custom nodes:
- `claim_block` with attributes
- `motif_block` with attributes
- `thread_block` with attributes
- `note_block` (excluded from embeddings)

### 3.2 AI Generation Pipeline
- Context assembly (constitution + chapter + section + memory)
- Structured JSON output contract
- Draft insertion (always starts as draft)

### 3.3 Draft/Canonical System
- Visual distinction in editor
- Promotion action (draft -> canonical)
- Only canonical triggers embedding

### 3.4 Section Writing Flow
- "Write Section" action
- AI generates draft with:
  - Prose
  - Suggested claims
  - Suggested motifs
  - Open threads
- User edits and promotes

---

## Phase 4: Memory & Embeddings (Days 11-13)

### 4.1 Embedding Rules
- Only canonical sections get embedded
- Only at milestones (v1, v2, final)
- Chapter summaries embedded
- Claims, motifs, threads embedded separately

### 4.2 Retrieval System
- Hierarchical: Constitution > Chapter > Section
- Selective based on current editing context
- Never retrieve drafts

### 4.3 Chunking Strategy
- 600-1200 tokens per chunk
- ~100 token overlap
- Section-aligned where possible

---

## Phase 5: Consistency & Finalization (Days 14-16)

### 5.1 Consistency Checks
- Contradiction detection
- Tone drift analysis
- Unresolved thread tracking
- Constitution violation detection

### 5.2 Chapter Finalization
- All sections canonical -> chapter can finalize
- Generate chapter summary
- Run consistency scan
- Queue embeddings

### 5.3 Book-Level Views
- Global indexes: Claims, Motifs, Threads
- Cross-chapter consistency report
- Export preparation

---

## Phase 6: UI Layout (Days 17-19)

### 6.1 Three-Panel Layout
```
┌─────────────┬─────────────────────────┬─────────────┐
│  Structure  │        Editor           │ Intelligence│
│             │                         │             │
│  - Book     │  - Constitution (if     │  - Const.   │
│  - Ch. 1    │    editing)             │    (pinned) │
│    - S 1.1  │  - Chapter meta         │  - Memory   │
│    - S 1.2  │  - Section prose        │  - Warnings │
│  - Ch. 2    │                         │  - Threads  │
│    ...      │  Draft vs Canonical     │             │
│             │  markers visible        │             │
└─────────────┴─────────────────────────┴─────────────┘
```

### 6.2 Status Indicators
- Chapter: draft | locked
- Section: draft | canonical
- Visual badges in structure panel

### 6.3 No Chat Window
- All AI interaction through structured actions
- Inline regeneration modifiers

---

## Phase 7: Collaboration & Polish (Days 20-21)

### 7.1 Velt Integration
- Update document context for book/chapter/section
- Node-ID anchored comments
- Presence cursors

### 7.2 Final Polish
- Error handling
- Loading states
- Mobile responsiveness (minimal)

---

## API Endpoints (Final)

| Endpoint | Purpose |
|----------|---------|
| POST `/api/ai/generate` | Generate drafts (sections, chapters, constitution) |
| POST `/api/ai/extract` | Extract claims/motifs/threads from text |
| POST `/api/ai/consistency` | Run consistency checks |
| POST `/api/embed` | Queue embedding jobs |
| GET/POST `/api/books` | CRUD for books |
| GET/POST `/api/books/[id]/chapters` | CRUD for chapters |
| GET/POST `/api/books/[id]/chapters/[chId]/sections` | CRUD for sections |
| POST `/api/books/[id]/constitution/lock` | Lock constitution |
| POST `/api/books/[id]/chapters/[chId]/lock` | Lock chapter |
| POST `/api/books/[id]/chapters/[chId]/sections/[sId]/promote` | Promote to canonical |

---

## Files to Delete

```
# Components
app/src/components/citations/
app/src/components/pdf/
app/src/components/evidence/
app/src/components/safety/
app/src/components/guardrails/
app/src/components/knowledge/
app/src/components/arguments/
app/src/components/ask/

# API Routes
app/src/app/api/citations/
app/src/app/api/import/
app/src/app/api/evidence/
app/src/app/api/safety/
app/src/app/api/guardrails/
app/src/app/api/knowledge/
app/src/app/api/search/

# Hooks
app/src/hooks/useGuardrails.ts
app/src/hooks/useKnowledgeGraph.ts
app/src/hooks/useSearch.ts

# Pages
app/src/app/(dashboard)/sources/
app/src/app/(dashboard)/knowledge/
app/src/app/(dashboard)/search/
```

---

## Files to Rename/Update

| File | Change |
|------|--------|
| `package.json` | name: "chronicle" |
| All "ResearchBase" text | -> "Chronicle" |
| Server on Hetzner | ResearchBase -> Chronicle |
| Vercel project | Update name |

---

## Success Criteria

1. User can create a book with constitution
2. Constitution must be locked before chapters
3. Chapters scaffold before writing
4. Sections have draft/canonical states
5. AI generates structured output only
6. Only canonical content gets embedded
7. Consistency checks work
8. Velt collaboration functions

---

## Out of Scope (V1)

- Screenplays
- Multi-author books
- Public sharing
- Publishing integrations
- Mobile app
