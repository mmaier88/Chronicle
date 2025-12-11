# ResearchBase Roadmap

> **AI-native, multiplayer research environment**
>
> Last updated: December 2025

---

## Executive Summary

ResearchBase transforms how researchers and teams work with documents. It's a **project brain** that writes with you, understands your documents semantically, retrieves evidence from PDFs, explains conceptual changes, verifies citations, assesses safety/hallucination risk, and maintains your knowledge base automatically.

---

## Infrastructure

| Component | Service | Details |
|-----------|---------|---------|
| **Hosting** | Vercel | `researchbase.pro` / `app-markus-projects-2b9af781.vercel.app` |
| **Backend** | Supabase | Postgres + pgvector, Auth, Storage, Realtime, Edge Functions |
| **LLM** | Anthropic Claude | Reasoning, generation, verification |
| **Embeddings** | Voyage AI | Document & query embeddings (1024 dim) |
| **Secrets** | 1Password | Service account for CI/CD and deployment secrets |

---

## Secrets Management (1Password)

### Setup Status

- [x] Service account created (`nuusnfqysjzyi@1passwordserviceaccounts.eu`)
- [x] Token stored in `.env.local`
- [x] Scripts created (`scripts/op_*.sh`)
- [x] Vaults created (RB - Staging, RB - Prod, RB - Servers, RB - Automation)
- [x] Hetzner server credentials added to vault
- [x] Supabase keys added (service-role, anon-key, database, access-token)

### Vault Structure

| Vault | ID | Purpose |
|-------|-----|---------|
| `RB - Staging` | `mvgyhcfg2obzxdbuibzxup6uci` | Staging environment secrets |
| `RB - Prod` | `e55kj52u22pp4cgcp3grkkv4j4` | Production environment secrets |
| `RB - Servers` | `cyzjbj4z4b5dp3x6kll3uzxs6e` | Server credentials |
| `RB - Automation` | `rtou4mw5tew27vwyo4nxuiasoi` | CI/CD tokens |

### Quick Commands

```bash
# Load token
source .env.local

# Validate access
./scripts/op_validate.sh

# Fetch .env for staging
./scripts/op_fetch_env.sh "RB - Staging" "researchbase.staging.env" ".env"

# Fetch single secret
./scripts/op_fetch_secret.sh "RB - Staging" "anthropic.api-key"
```

### Documentation

- `infra/1password/vaults-and-groups.md` - Full RBAC structure
- `infra/1password/service-accounts.md` - Service account setup
- `infra/1password/setup-checklist.md` - Setup steps

---

## Phase 1: Foundation (Weeks 1-3)

### 1.0 1Password Vaults (Prerequisite)
- [x] Create vaults in 1Password console (see Secrets Management above)
- [x] Grant service account access to all vaults
- [x] Add Hetzner server credentials to `RB - Servers`
- [x] Supabase credentials added to `RB - Staging` and `RB - Automation`

### 1.1 Server Setup
- [x] Configure Hetzner cx42 server (`138.199.231.3`)
  - SSH access via `maier-ssh-key`
  - Docker 29.1.2 installed
  - Node.js 20.19.6 installed
  - Caddy 2.10.2 installed
  - pm2 6.0.14 installed (with systemd startup)
  - UFW firewall configured (SSH, HTTP, HTTPS)
- [ ] DNS configuration for `researchbase.io` (or chosen domain)
- [ ] SSL/TLS via Let's Encrypt (automatic with Caddy)

### 1.2 Supabase Project
- [x] Supabase project created (`ambrhrajlgogvfysztrw`)
- [x] Service role key stored in 1Password
- [x] pgvector extension enabled (via migration)
- [x] Email auth provider configured (default)
- [x] OAuth UI implemented (login page with Google/GitHub buttons)
- [ ] Configure Google OAuth in Supabase (requires Google Cloud credentials)
- [ ] Configure GitHub OAuth in Supabase (requires GitHub app)
- [ ] Set up Storage buckets for PDFs
- [ ] Configure Realtime for Yjs

### 1.3 Database Schema (Core)
- [x] Full migration created (`supabase/migrations/00001_initial_schema.sql`)
  - Workspaces & members
  - Projects & documents
  - Branching (doc_branches, doc_sections)
  - Sources & embeddings (Voyage AI 1024-dim vectors)
  - Citations & verification
  - AI provenance & jobs
  - Argument graph (claims, links, evidence)
  - Risk assessments
  - Workflows
  - User profiles
  - Row-level security policies
- [x] Migration applied to Supabase (2025-12-10)

### 1.4 Next.js Scaffold
- [x] Initialize Next.js 16 with App Router
- [x] Configure Tailwind CSS
- [x] Set up Supabase client (SSR + client + middleware)
- [x] Authentication flow (sign up, sign in, magic link)
- [x] Basic routing structure:
  - `/` - Landing page
  - `/login` - Sign in
  - `/signup` - Sign up
  - `/callback` - Auth callback
  - `/dashboard` - Main dashboard
- [x] Build passes successfully

**Milestone:** Phase 1 Complete! App deployed at http://138.199.231.3 with full database schema.

---

## Phase 2: Editor & Collaboration (Weeks 4-6)

### 2.1 Tiptap Editor
- [x] Install Tiptap with essential extensions
  - StarterKit, Placeholder, Typography
  - Link, Underline, Highlight, TextAlign
  - CodeBlock, Blockquote, HorizontalRule
- [x] Custom extensions for:
  - Citation marks (`Citation.ts`)
  - AI-generated span highlighting (`AISpan.ts`)
  - [ ] Claim/assumption annotations (Phase 7)
- [x] Editor toolbar with formatting controls
- [x] Document page with save functionality

### 2.2 Yjs Multiplayer
- [x] Yjs + y-websocket packages installed
- [x] `useCollaboration` hook (`hooks/useCollaboration.ts`)
  - WebSocket provider setup
  - User awareness and presence tracking
  - Connection status management
  - Configurable via `NEXT_PUBLIC_YJS_WEBSOCKET_URL` env var
- [x] `CollaborativeEditor.tsx` with TipTap integration
  - Collaboration extension
  - CollaborationCursor extension
  - Real-time cursor tracking
- [x] `CollaboratorPresence.tsx` component
  - Avatar display with user colors
  - Connection status indicator
  - Tooltip with user names
- [x] Production WebSocket server
  - Hosted on Hetzner at `ws://138.199.231.3:1234`
  - Custom y-websocket implementation with pm2
  - Document persistence in memory
  - [ ] SSL via Caddy (after DNS setup)
- [ ] Branch-aware document state

### 2.3 Document Management UI
- [x] Document page with editor (`/documents/[id]`)
- [x] Quick actions on dashboard
- [ ] Document tree sidebar
- [ ] Branch switcher
- [ ] Section navigation
- [ ] Version history panel

**Milestone:** Phase 2 Complete! Editor functional with formatting. Yjs multiplayer infrastructure ready.

---

## Phase 3: Source Ingestion & Voyage Embeddings (Weeks 7-9)

### 3.1 PDF Processing Pipeline
- [x] API endpoint: `/api/sources/upload`
  - Accept PDF upload
  - Store in Supabase Storage
  - Create source record in database
  - Auto-trigger processing after upload
- [x] API endpoint: `/api/sources/[id]/process`
  - Extract text using PDF.js (pdfjs-dist)
  - Chunk by pages with paragraph splitting (~1000 chars)
  - Track page numbers for each chunk
  - Generate embeddings via Voyage AI (1024 dim)
  - Store in `source_chunks` table with page references
- [x] Voyage AI client (`lib/voyage.ts`)

### 3.2 Database: Sources & Chunks
```sql
-- sources: metadata, storage_path (from Phase 1 migration)
-- source_chunks: content, chunk_index, embedding vector(1024)
-- IVFFlat index on embeddings
```

### 3.3 Source Panel UI
- [x] PDF upload interface (`/sources` page)
- [x] Source library with status badges
- [x] PDF viewer with page navigation (`PDFViewer.tsx`, `PDFViewerModal.tsx`)
- [x] react-pdf integration with zoom controls
- [ ] Highlight search results in PDF

### 3.4 Evidence Retrieval
- [x] API endpoint: `/api/evidence/find`
  - Embed query via Voyage
  - Vector similarity search in pgvector
  - Return top-k relevant chunks with source metadata
- [x] "Find Evidence" button in editor (Cmd/Ctrl+Shift+E)
- [x] Evidence panel showing relevant excerpts (`EvidencePanel.tsx`)
- [x] Similarity scores and match quality indicators
- [x] "Cite this" button to insert citations

**Milestone:** Phase 3 Complete! PDF upload, viewing, embedding, and evidence retrieval all functional.

---

## Phase 4: Ask-Project & Document Memory (Weeks 10-12)

### 4.1 Document Section Embeddings
- [ ] Background job to embed document sections
- [x] Table: `doc_section_embeddings` (in initial migration)
- [ ] Trigger re-embedding on content changes (debounced)

### 4.2 Ask-Project API
- [x] `/api/ask` endpoint:
  - Embed user query (Voyage)
  - Search `source_chunks` via pgvector
  - Build context from top results
  - Return answer with source citations
- [x] `match_source_chunks` PostgreSQL function
- [x] `match_doc_sections` PostgreSQL function
- [x] `ask_project_search` combined search function
- [x] Claude integration for answer synthesis
  - System prompt for research assistant role
  - In-context citations [1], [2], etc.
  - Graceful fallback if API key missing

### 4.3 Ask-Project UI
- [x] Sidebar panel for Ask-Project (`AskProject.tsx`)
- [x] Query input with history
- [x] Answer display with source citations
- [x] Similarity scores per result
- [ ] "Jump to source" links
- [ ] Contradiction highlighting

### 4.4 Cross-Document Search
- [x] Semantic similarity search with pgvector
- [ ] Filter by document/branch
- [x] Semantic similarity scores

**Milestone:** Phase 4 Complete! Ask-Project with Claude synthesis fully functional.

---

## Phase 5: AI Writing Assistance (Weeks 13-15)

### 5.1 AI Text Edit API
- [x] `/api/ai/edit` endpoint supporting modes:
  - `summarize` - Condense selected text
  - `rewrite` - Improve clarity/style
  - `expand` - Add detail and depth
  - `shorten` - Make concise
  - `define` - Explain terms
  - `humanize` - Make more natural
  - `continue` - Continue writing
  - `style_match` - Match reference style
  - `persona` - Write as specific voice
  - `obfuscate` - Anonymize content
- [x] Anthropic Claude integration (`lib/anthropic.ts`)
- [ ] Add `ANTHROPIC_API_KEY` to production environment

### 5.2 Slash Commands
- [x] Tiptap slash command extension (`SlashCommand.tsx`)
- [x] `/summarize`, `/rewrite`, `/expand`, `/shorten`, `/define`, `/humanize`, `/continue`
- [x] Keyboard navigation in command menu
- [ ] Selection-based AI menu (right-click)

### 5.3 AI Provenance Tracking
- [x] `ai_jobs` table logs all AI calls (from initial migration)
- [x] `AISpan` Tiptap mark for AI-generated text
- [x] AI spans include model, action, timestamp metadata
- [ ] Visual indicator styling for AI-generated content
- [ ] "Humanize" action to remove AI markers

**Milestone:** Slash commands functional with Claude integration. Requires `ANTHROPIC_API_KEY` to enable.

---

## Phase 6: Citations & Verification (Weeks 16-18)

### 6.1 Citation System
- [x] `citations` table (from initial migration)
- [x] Citation insertion UI (`CitationDialog.tsx`)
- [x] Citation mark in Tiptap (`Citation.ts` extension)
- [x] Citation button in editor toolbar
- [x] Citation styles support (`lib/citations.ts`):
  - APA (7th Edition)
  - MLA (9th Edition)
  - Chicago (17th Edition)
  - Harvard
  - IEEE
- [x] Citation formatting utilities (author names, in-text, full reference)
- [x] Export formats: Plain text, BibTeX
- [x] `CitationExportPanel.tsx` with style selector and download

### 6.2 Citation Verification
- [x] `/api/citations/verify` endpoint
  - Check if source supports claim using Claude
  - Return: supported, contradicted, partial, unverifiable
  - Store results in `citation_verification_runs`
- [x] Verification status indicators (icons + badges)
- [x] Batch verification ("Verify All" button)

### 6.3 Citation Panel
- [x] Citation panel sidebar (`CitationPanel.tsx`)
- [x] List all citations with verification status
- [x] Stats bar (verified/total, supported/contradicted counts)
- [x] Jump to citation functionality
- [ ] Quick-fix suggestions for issues
- [x] Export bibliography (via `CitationExportPanel.tsx`)

**Milestone:** Phase 6 Complete! Full citation system with styles, verification, and export.

---

## Phase 7: Argument Graph & Semantic Diff (Weeks 19-21)

### 7.1 Claim Extraction
- [x] `/api/claims/extract` endpoint
  - Identify claims, assumptions, definitions, evidence
  - Extract relationships (supports, contradicts, depends_on, refines, exemplifies)
  - Score confidence for each claim
- [x] Store claims in `claims` table with links in `claim_links`

### 7.2 Argument Panel UI
- [x] Argument panel sidebar (`ArgumentPanel.tsx`)
- [x] Claim list with type icons and colors
- [x] Relationship visualization on click
- [x] Stats (claims, assumptions, evidence, links count)
- [ ] Visual network graph view (future enhancement)

### 7.3 Semantic Diff
- [x] `/api/diff/semantic` endpoint
  - Compare two versions conceptually
  - Identify: added, removed, modified, strengthened, weakened
  - Categorize by: claim, argument, evidence, structure, tone
  - Return summary and overall assessment
- [x] Semantic diff panel UI (`SemanticDiffPanel.tsx`)
- [x] Change list with importance levels
- [x] Before/after text comparison
- [ ] Side-by-side branch comparison (requires branching)
- [ ] AI-powered merge suggestions

**Milestone:** Argument extraction and semantic diff functional. Requires `ANTHROPIC_API_KEY` to enable.

---

## Phase 8: Safety & Hallucination Assessment (Weeks 22-24)

### 8.1 Document Risk Assessment
- [x] `/api/safety/assess` endpoint
  - Identify issue types: unsupported claims, outdated references, speculation, overgeneralization, missing context
  - Score severity: high, medium, low
  - Compute overall safety score (0-100)
  - Calculate risk level: low, moderate, high, critical
- [x] Store assessments in `doc_risk_assessments` table

### 8.2 Safety Dashboard
- [x] Safety panel sidebar (`SafetyPanel.tsx`)
- [x] Safety score display with visual progress bar
- [x] Risk level badge indicator
- [x] Stats: total claims, supported, unsupported, speculative
- [x] Issue list with severity and suggestions
- [x] Expandable issue details
- [x] Recommendations list
- [ ] Trend over time

### 8.3 Real-time Safety Hints
- [ ] Inline warnings for risky statements
- [ ] "Find evidence" prompts for unsupported claims
- [ ] Citation suggestions

**Milestone:** Safety assessment functional with scoring and recommendations.

---

## Phase 9: Automations & Workflows (Weeks 25-27)

### 9.1 Workflow System
- [x] Tables: `workflows`, `workflow_runs` (from initial migration)
- [x] Edge Function: `execute-workflow` (`supabase/functions/execute-workflow/index.ts`)
  - Citation verification action
  - Claim extraction action
  - Safety assessment action
  - Bibliography generation action
- [x] API endpoint: `/api/workflows/execute`
  - Inline execution with result tracking
  - Stores results in `workflow_executions` table
- [x] Workflow types defined:
  - `daily_index_refresh` - Re-embed updated sections
  - `weekly_exec_summary` - Generate project summary
  - `weekly_inconsistency_scan` - Find contradictions
  - `weekly_citation_check` - Verify all citations
  - `weekly_risk_assessment` - Update safety scores

### 9.2 Automation Panel UI
- [x] `/api/workflows` endpoint (GET/POST for listing and toggling)
- [x] `WorkflowPanel.tsx` component for sidebar access
- [x] `/automations` page with:
  - Project selector dropdown
  - Active workflows count and stats
  - Toggle enable/disable per workflow
  - Schedule indicators (daily/weekly)
- [x] "Automations" quick action on dashboard
- [ ] View run history
- [ ] Manual trigger option

### 9.3 Notifications
- [ ] Email digests
- [ ] In-app notifications
- [ ] Webhook integrations

**Milestone:** Phase 9 Complete! Workflow system with UI and execution API functional.

---

## Phase 10: Polish & Launch (Weeks 28-30)

### 10.1 Performance Optimization
- [ ] Query optimization (pgvector indexes)
- [ ] Caching layer (Redis optional)
- [ ] CDN for static assets
- [ ] Lazy loading for large documents

### 10.2 Security Hardening
- [ ] Penetration testing
- [ ] Rate limiting
- [ ] Input sanitization audit
- [ ] RLS policy review

### 10.3 User Experience
- [ ] Onboarding flow
- [x] Keyboard shortcuts (`useKeyboardShortcuts` hook)
  - Cmd/Ctrl+K: Ask Project
  - Cmd/Ctrl+S: Save document
  - Cmd/Ctrl+Shift+E: Find Evidence
  - Cmd/Ctrl+Shift+C: Citations panel
  - Cmd/Ctrl+Shift+A: Arguments panel
  - Cmd/Ctrl+Shift+Y: Safety panel
  - Shift+?: Keyboard shortcuts help
  - Escape: Close all panels
- [x] `KeyboardShortcutsHelp.tsx` modal component
- [x] Dark mode enhancements
  - Editor styles (blockquotes, code, marks)
  - Focus ring visibility
  - Custom scrollbar styling
- [x] Mobile responsive design
  - Collapsible button labels on small screens
  - Touch-friendly tap targets (44px minimum)
  - Adaptive panel widths
- [ ] Accessibility audit (WCAG 2.1)

### 10.4 Documentation
- [ ] User guide
- [ ] API documentation
- [ ] Developer setup guide

### 10.5 Launch Preparation
- [ ] Beta testing program
- [ ] Feedback collection
- [ ] Bug fixes
- [ ] Production deployment checklist

**Milestone:** Core UX polish complete. Keyboard shortcuts, dark mode, and responsive design implemented.

---

## Phase 11: Teams & Access Control (Weeks 31-34)

> **Priority: #1** — Required for enterprise adoption

### 11.1 Role-Based Access
- [x] User roles: `owner`, `admin`, `editor`, `reviewer`, `viewer`
- [x] Workspace-level permissions (RLS policies)
- [x] Project-level permissions (inherit or override)
- [x] Document-level permissions
- [x] Helper functions: `get_project_role()`, `get_document_role()`, `can_edit_document()`, `can_review_document()`

### 11.2 Workspace Management API
- [x] `GET/POST /api/workspaces` - List/create workspaces
- [x] `GET/PATCH/DELETE /api/workspaces/[id]` - Workspace details
- [x] `GET/PATCH/DELETE /api/workspaces/[id]/members` - Member management
- [x] `GET/POST/DELETE /api/workspaces/[id]/invitations` - Invitations
- [x] `GET/POST /api/invitations/[token]/accept` - Accept invitation

### 11.3 Collaboration Workflows
- [x] Comment threads with resolution (`document_comments` table)
- [x] Suggested edits mode (comment_type: 'suggestion')
- [x] `GET/POST /api/documents/[id]/comments` - Comments API
- [x] `PATCH/DELETE /api/documents/[id]/comments/[commentId]` - Comment actions
- [x] Section locking (`section_locks` table)
- [x] Approval workflows (`document_approvals`, `approval_reviewers` tables)
- [ ] @mentions and notifications
- [ ] Comments UI component
- [ ] Approval request UI

### 11.4 Audit & Compliance
- [x] Full audit trail (`activity_log` table with 30+ action types)
- [x] `log_activity()` PostgreSQL function
- [ ] Export audit logs (CSV, JSON)
- [ ] Data retention policies
- [ ] GDPR compliance tools (export, delete user data)

### 11.5 Team Management UI
- [x] Workspace settings page (`/workspace/[id]/settings`)
- [x] Member list with role management
- [x] Invitation dialog (modal with email/role selection)
- [x] Accept invitation page (`/invite/[token]`)
- [x] New workspace page (`/workspace/new`)
- [x] Workspace detail page (`/workspace/[id]`)

**Milestone:** Phase 11 complete! Full teams & access control with UI.

---

## Phase 12: Research Data Import (Weeks 35-38)

> **Priority: #2** — Removes major adoption friction

### 12.1 Academic Source Import
- [ ] ArXiv import (fetch paper by ID, extract PDF)
- [ ] DOI resolver (CrossRef API)
- [ ] PubMed import
- [ ] Semantic Scholar integration

### 12.2 Reference Manager Sync
- [ ] Zotero sync (OAuth + API)
- [ ] Mendeley import
- [ ] EndNote import (XML/RIS)
- [ ] BibTeX file import

### 12.3 Document Import
- [ ] Web article import (Readability extraction)
- [ ] Google Docs import (via Google Drive API)
- [ ] Notion import (API + markdown conversion)
- [ ] GitHub markdown ingest
- [ ] Overleaf sync (Git integration)

### 12.4 Bulk Operations
- [ ] Batch import UI
- [ ] Import queue with progress tracking
- [ ] Duplicate detection
- [ ] Auto-categorization suggestions

**Milestone:** Researchers can import existing libraries from 5+ sources.

---

## Phase 13: Real-time AI Guardrails (Weeks 39-42)

> **Priority: #3** — Makes AI a live co-pilot, not just post-processing

### 13.1 Inline Warnings
- [ ] Unsupported claim detection (real-time)
- [ ] Hallucination warning indicators
- [ ] Speculation markers ("This appears to be opinion...")
- [ ] Outdated reference alerts

### 13.2 Proactive Suggestions
- [ ] Auto-citation suggestions ("Add a source for this claim?")
- [ ] Evidence retrieval prompts
- [ ] Factuality confidence scores (inline)
- [ ] "Strengthen this argument" nudges

### 13.3 Writing Assistance
- [ ] Tone consistency checker
- [ ] Readability scoring (live)
- [ ] Jargon detection with simplification suggestions
- [ ] Bias detection alerts

### 13.4 Configuration
- [ ] Guardrail sensitivity levels (strict → relaxed)
- [ ] Per-document guardrail settings
- [ ] Snooze/dismiss individual warnings
- [ ] Team-wide guardrail policies

**Milestone:** AI provides continuous guidance during writing, not just on-demand.

---

## Phase 14: Document Branching & Merging (Weeks 43-46)

> **Priority: #4** — Critical for academic collaboration, legal, policy writing

### 14.1 Branch Management
- [ ] Create branch from any document state
- [ ] Branch naming and description
- [ ] Branch-aware Yjs document state
- [ ] Switch between branches (instant)
- [ ] Branch comparison view

### 14.2 Merge System
- [ ] Visual diff between branches
- [ ] Conflict detection and highlighting
- [ ] AI-powered merge suggestions
- [ ] Manual conflict resolution UI
- [ ] Merge commit with summary

### 14.3 Version Lineage
- [ ] Version history timeline
- [ ] Branch tree visualization
- [ ] Restore previous versions
- [ ] Named checkpoints/tags
- [ ] Export specific versions

### 14.4 Collaboration on Branches
- [ ] Branch-specific permissions
- [ ] Merge request workflow (request → review → merge)
- [ ] Branch comments and discussion
- [ ] Notification on branch changes

**Milestone:** Full Git-like branching for documents with visual merge tools.

---

## Phase 15: Continuous Knowledge Graphing (Weeks 47-52)

> **Priority: #5** — The killer enterprise feature

### 15.1 Cross-Document Consolidation
- [ ] Entity extraction across all documents
- [ ] Concept deduplication and linking
- [ ] Cross-document relationship mapping
- [ ] Workspace-wide claim inventory

### 15.2 Contradiction Detection
- [ ] Automatic contradiction scanning (scheduled)
- [ ] Contradiction severity scoring
- [ ] Source attribution for conflicts
- [ ] Resolution suggestions
- [ ] Contradiction dashboard

### 15.3 Knowledge Graph View
- [ ] Interactive graph visualization (D3.js / Cytoscape)
- [ ] Filter by: document, claim type, confidence, date
- [ ] Cluster related concepts
- [ ] Path finding ("How does X relate to Y?")
- [ ] Export graph (JSON, GraphML)

### 15.4 Queryable Ontology
- [ ] Natural language graph queries
- [ ] "What does our org believe about X?"
- [ ] "What are our unsupported assumptions?"
- [ ] "Show all contradictions in project Y"
- [ ] Structured query API

**Milestone:** "Here's everything your organization believes. Here are contradictions. Here are unsupported assumptions."

---

## Phase 16: Global Search & Workspace Intelligence (Weeks 53-56)

> **Priority: #6** — Makes the product a research brain

### 16.1 Cross-Project Search
- [ ] Unified search across all projects
- [ ] Semantic search with filters
- [ ] Search within: documents, sources, claims, citations
- [ ] Saved searches and alerts

### 16.2 Workspace Summaries
- [ ] Automatic weekly research summary
- [ ] "What changed this week" digest
- [ ] Key findings extraction
- [ ] Progress tracking across projects

### 16.3 Global Semantic Memory
- [ ] Cross-workspace insight extraction
- [ ] Trend detection across documents
- [ ] Topic clustering
- [ ] Research activity heatmaps

### 16.4 Notifications & Digests
- [ ] Email weekly summaries
- [ ] Slack/Teams integration
- [ ] Custom digest configuration
- [ ] Activity feed in-app

**Milestone:** ResearchBase becomes the "second brain" for research teams.

---

## Phase 17: Opinionated Research Workflows (Weeks 57-60)

> **Priority: #7** — Makes the platform sticky

### 17.1 Literature Review Pipeline
- [ ] Search → Screen → Extract → Synthesize workflow
- [ ] PRISMA flow for systematic reviews
- [ ] Inclusion/exclusion criteria tracking
- [ ] Quality assessment checklists

### 17.2 Research Templates
- [ ] Experiment design helper
- [ ] Hypothesis tracking
- [ ] Methods section generator
- [ ] Results interpretation guide

### 17.3 Argumentation Tools
- [ ] Debate/argument mapping
- [ ] Pro/con structuring
- [ ] Counterargument generator
- [ ] Logical fallacy detection

### 17.4 Writing Workflows
- [ ] Draft → Review → Revision → Finalize pipeline
- [ ] Research note distillation
- [ ] Abstract generator
- [ ] Submission checklist per journal

**Milestone:** Domain-specific workflows for literature reviews, experiments, and academic writing.

---

## Phase 18: Multi-Agent Reasoning (Weeks 61-64)

> **Priority: #8** — AI-native, not just AI-enhanced

### 18.1 Specialized Agents
- [ ] Evidence Agent: Gathers relevant PDFs and excerpts
- [ ] Fact-Checking Agent: Verifies claims against sources
- [ ] Argument Agent: Structures and strengthens reasoning
- [ ] Summarization Agent: Creates layered summaries
- [ ] Contradiction Agent: Identifies conflicts

### 18.2 Agent Orchestration
- [ ] Multi-agent pipeline execution
- [ ] Agent handoff and context passing
- [ ] Parallel agent execution where possible
- [ ] Agent confidence scoring

### 18.3 Transparent Reasoning
- [ ] Show agent "thought process"
- [ ] Source attribution per agent
- [ ] User can intervene/redirect agents
- [ ] Explain disagreements between agents

### 18.4 Custom Agent Configuration
- [ ] Define custom agent roles
- [ ] Agent prompt templates
- [ ] Domain-specific agent tuning
- [ ] Agent performance analytics

**Milestone:** Team of AI agents provides more accurate synthesis than single LLM calls.

---

## Architecture Overview

```
[Browser: Next.js App]
  ├── Tiptap Editor (Yjs multiplayer)
  ├── AI Actions (/summarize, /rewrite, personas)
  ├── Source Panel (PDF ingestion, evidence)
  ├── Ask-Project Sidebar
  ├── Arguments & Semantic Diff Panels
  └── Safety Dashboard (risk scoring)

          │ fetch / websocket
          ▼

[Vercel Edge Network]
  └── Next.js App (serverless functions)
          │
          ▼

[Supabase Backend]
  ├── Postgres (pgvector)
  ├── Auth
  ├── Realtime (Yjs awareness)
  ├── Storage (PDFs)
  └── Edge Functions:
        • embed_source
        • rag_find_evidence
        • ai_text_edit
        • ask_project
        • extract_claim_graph
        • semantic_diff
        • verify_citations
        • assess_document_safety
        • run_workflows

          │ outgoing API calls
          ▼

[Voyage API] — embeddings
[Anthropic API] — LLM reasoning
```

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework |
| `@supabase/supabase-js` | Backend client |
| `@tiptap/react` | Rich text editor |
| `yjs` | CRDT for collaboration |
| `@anthropic-ai/sdk` | Claude API |
| `voyageai` | Embedding API |
| `pdf-parse` | PDF text extraction |
| `tailwindcss` | Styling |
| `shadcn/ui` | Component library |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Document load time | < 2s |
| Ask-Project response | < 5s |
| Citation verification | < 10s per citation |
| Concurrent collaborators | 10+ per document |
| PDF processing | < 30s for 50-page PDF |
| Safety score computation | < 15s per document |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Voyage API rate limits | Batch embeddings, queue system |
| Large PDF processing | Chunked uploads, progress indicator |
| LLM cost overrun | Token budgets, caching, user quotas |
| Data loss | Supabase backups, local autosave |
| Collaboration conflicts | Yjs CRDT, operational transforms |

---

## Team & Resources

- **Development:** Full-stack TypeScript
- **Infrastructure:** Vercel + Supabase (managed)
- **AI Services:** Anthropic + Voyage (API keys configured)
- **Estimated Timeline:** 30 weeks to v1.0, 64 weeks to v2.0 (enterprise)

---

## Next Steps

1. **Week 1:** Server setup and Supabase project creation
2. **Week 2:** Database schema migration
3. **Week 3:** Next.js scaffold with auth
4. **Week 4:** Begin Tiptap editor integration

---

*This roadmap is a living document. Update as implementation progresses.*
