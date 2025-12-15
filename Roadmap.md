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

### 2.2 Yjs Multiplayer (Legacy - Being Replaced by Velt)
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

> **Note:** Yjs infrastructure is being replaced by Velt SDK. See Phase 19 for migration status.

### 2.3 Velt Collaboration (NEW - Replacing Yjs)
- [x] Velt SDK packages installed
  - `@veltdev/react` - Core React SDK
  - `@veltdev/tiptap-velt-comments` - Tiptap integration
  - `@veltdev/tiptap-crdt-react` - CRDT support
- [x] Credentials stored in 1Password (`RB - Staging` vault)
- [x] Environment variables configured
  - `NEXT_PUBLIC_VELT_API_KEY` in `.env.local` and Vercel production
- [x] `VeltProvider.tsx` wrapper component
- [x] `useVeltAuth.ts` hook for Supabase → Velt user sync
- [x] `VeltEditor.tsx` - New collaborative editor with:
  - TiptapVeltComments extension
  - BubbleMenu for adding comments
  - VeltPresence indicators
  - VeltCursor tracking
  - VeltCommentsSidebar
  - Preserved custom extensions (Citation, AISpan, SlashCommand)
- [x] `VeltPresenceDisplay.tsx` - Enhanced presence UI
- [ ] Wrap app with VeltProvider in root layout
- [ ] Update document pages to use VeltEditor
- [ ] Test real-time collaboration with multiple users

### 2.4 Document Management UI
- [x] Document page with editor (`/documents/[id]`)
- [x] Quick actions on dashboard
- [x] Document tree sidebar (`DocumentTreeSidebar.tsx`)
  - Search documents in project
  - Group by recent/older
  - Quick navigation between documents
  - Keyboard shortcut (Ctrl+Shift+D)
- [x] Branch switcher (`BranchSelector.tsx`)
- [x] Section navigation (`TableOfContents.tsx`)
  - Auto-extract headings from content
  - Scroll to heading on click
  - Keyboard shortcut (Ctrl+Shift+T)
- [x] Version history panel (`VersionHistoryPanel.tsx`)
- [x] Merge request panel (`MergeRequestPanel.tsx`)

**Milestone:** Phase 2 Complete! Editor functional with formatting. Velt collaboration infrastructure ready, pending activation.

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
- [x] "Jump to source" links (View in source button opens PDFViewerModal at page)
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
- [x] ArXiv import (`/api/import/arxiv` - search + import by ID)
- [x] DOI resolver (`/api/import/doi` - CrossRef API)
- [ ] PubMed import
- [ ] Semantic Scholar integration

### 12.2 Reference Manager Sync
- [ ] Zotero sync (OAuth + API)
- [ ] Mendeley import
- [ ] EndNote import (XML/RIS)
- [x] BibTeX file import (`/api/import/bibtex`)

### 12.3 Document Import
- [x] Web article import (`/api/import/web` - content extraction)
- [ ] Google Docs import (via Google Drive API)
- [ ] Notion import (API + markdown conversion)
- [ ] GitHub markdown ingest
- [ ] Overleaf sync (Git integration)

### 12.4 Bulk Operations
- [x] Import UI (`/sources/import` - ArXiv, DOI, BibTeX, Web tabs)
- [ ] Import queue with progress tracking
- [x] Duplicate detection (by DOI, external_id)
- [ ] Auto-categorization suggestions

**Milestone:** Core import functionality complete! ArXiv, DOI, BibTeX, and Web imports working.

---

## Phase 13: Real-time AI Guardrails (Weeks 39-42)

> **Priority: #3** — Makes AI a live co-pilot, not just post-processing

### 13.1 Inline Warnings
- [x] Unsupported claim detection (`/api/guardrails/analyze`)
- [x] Hallucination warning indicators
- [x] Speculation markers
- [x] Bias detection

### 13.2 Proactive Suggestions
- [x] Auto-citation suggestions (`/api/guardrails/suggest-citations`)
- [x] Evidence retrieval from project sources
- [x] Factuality confidence scores
- [x] Fact-checking API (`/api/guardrails/fact-check`)

### 13.3 Writing Assistance
- [x] Tone consistency checker (`/api/guardrails/writing`)
- [x] Readability scoring (Flesch score)
- [x] Jargon detection with simplification
- [x] Text simplification API (PUT `/api/guardrails/writing`)
- [x] Passive voice detection

### 13.4 Configuration
- [x] Guardrail sensitivity levels (strict/medium/relaxed)
- [x] Configurable check types
- [x] Dismiss individual warnings
- [x] React hook (`useGuardrails`)
- [x] Guardrails panel component

**Milestone:** Phase 13 complete! AI guardrails with warnings, suggestions, fact-checking, and writing assistance.

---

## Phase 14: Document Branching & Merging (Weeks 43-46)

> **Priority: #4** — Critical for academic collaboration, legal, policy writing

### 14.1 Branch Management
- [x] Create branch from any document state (`POST /api/documents/[id]/branches`)
- [x] Branch naming and description
- [x] Copy content from parent branch
- [x] Switch between branches (via `useBranches` hook)
- [x] Delete branches (non-main only)

### 14.2 Merge System
- [x] Branch diff API (`GET /api/documents/[id]/branches/[branchId]/diff`)
- [x] Conflict detection and highlighting
- [x] AI-powered diff analysis (`POST .../diff`)
- [x] AI-powered merge suggestions (`PUT .../merge`)
- [x] Merge with conflict resolution (`POST .../merge`)

### 14.3 Version Lineage (Git-Style Versioning)
- [x] Branch tree structure (parent/children tracking)
- [x] Database schema for versioning (`00010_document_versioning.sql`)
  - `doc_snapshots` - Version snapshots with CRDT state
  - `doc_diffs` - Computed diffs between snapshots
  - `merge_requests` - PR-style merge workflow
  - `merge_request_comments` - Discussion on MRs
- [x] Snapshot API (`/api/documents/[id]/snapshots`)
  - GET: List version history
  - POST: Create version snapshot with commit message
- [x] Snapshot detail API (`/api/documents/[id]/snapshots/[snapshotId]`)
  - GET: Get specific snapshot with CRDT state
  - DELETE: Delete snapshot (with permission check)
- [x] Merge Request API (`/api/documents/[id]/merge-requests`)
  - GET: List merge requests
  - POST: Create merge request
- [x] Merge Request detail API (`/api/documents/[id]/merge-requests/[mrId]`)
  - GET: Get MR details with comments
  - PATCH: Update MR (title, description, status)
- [x] Merge execution API (`/api/documents/[id]/merge-requests/[mrId]/merge`)
  - POST: Execute merge operation
- [ ] Restore previous versions (UI pending)
- [ ] Named checkpoints/tags
- [ ] Export specific versions

### 14.4 Version History UI
- [x] `VersionHistoryPanel.tsx` - Git-style commit log
  - Timeline view of snapshots
  - Commit messages and metadata
  - View/restore snapshot actions
  - Compare mode for selecting two versions
- [x] `BranchSelector.tsx` - Branch switching dropdown
  - List all branches
  - Create new branch option
  - Current branch indicator
- [x] `MergeRequestPanel.tsx` - PR-style merge interface
  - List open/merged/closed MRs
  - Create MR form
  - Status badges
  - Integrated into document page header
- [x] `DiffViewer.tsx` - Diff viewer component
  - LCS-based line-by-line diff algorithm
  - Color-coded additions/deletions
  - Show/hide unchanged lines toggle
  - Statistics (additions, deletions count)
- [x] Branch selector integrated into document header
- [x] Create Branch modal with name input
- [x] Restore version functionality from snapshots
- [x] Create Merge Request modal from branches

### 14.5 Collaboration on Branches
- [x] Track merge history (merged_at, merged_by)
- [x] Merge request workflow with status tracking
- [ ] Branch-specific permissions
- [ ] MR comments and discussion (schema ready)

**Milestone:** Full Git-style versioning system with snapshots, merge requests, and version history UI!

---

## Phase 15: Continuous Knowledge Graphing (Weeks 47-52) ✅

> **Priority: #5** — The killer enterprise feature

### 15.1 Cross-Document Consolidation ✅
- [x] Entity extraction across all documents (`/api/knowledge/extract`)
  - AI-powered extraction of persons, orgs, concepts, claims, methodologies, findings, datasets
  - Automatic deduplication via normalized names
  - Entity mentions tracked with document context
- [x] Concept deduplication and linking (`/api/knowledge/entities/[id]` POST for merge)
- [x] Cross-document relationship mapping (`/api/knowledge/relationships`)
  - 12 relationship types: supports, contradicts, related_to, derived_from, etc.
- [x] Workspace-wide claim inventory (entities with type='claim')

### 15.2 Contradiction Detection ✅
- [x] AI-powered contradiction detection (`/api/knowledge/contradictions` POST)
- [x] Contradiction severity scoring (low/medium/high/critical)
- [x] Source attribution for conflicts (document_a_id, document_b_id)
- [x] Resolution suggestions (AI-generated possible_resolutions)
- [x] Contradiction status management (detected/confirmed/resolved/dismissed)

### 15.3 Knowledge Graph View ✅
- [x] Graph data API (`/api/knowledge/graph`)
  - Center-focused traversal with configurable depth
  - Filter by entity types, relationship types, document
  - Stats: node count, edge count, type distribution
- [x] Graph snapshots for versioning (`/api/knowledge/graph` POST)
- [x] Interactive graph visualization (`react-force-graph-2d`)
  - Force-directed layout with zoom/pan
  - Color-coded by entity type
  - Node size by mention count
  - Edge arrows and labels
- [x] Entity detail panel with relationships and mentions
- [ ] Cluster related concepts
- [ ] Path finding ("How does X relate to Y?")
- [ ] Export graph (JSON, GraphML)

### 15.4 Queryable Ontology ✅
- [x] Structured query API (list entities, relationships, contradictions with filters)
- [x] React hook `useKnowledgeGraph` with `queryKnowledge` method
- [x] Natural language graph queries (`/api/knowledge/query`)
  - AI-powered answers from knowledge graph context
  - Returns relevant entities, relationships, contradictions
  - Confidence scoring and gap identification
- [x] Knowledge page (`/knowledge`) with:
  - Interactive graph visualization
  - Entity detail panel
  - Quick query suggestions
  - Contradiction alerts

**Database Migration:** `00004_knowledge_graph.sql`
- Entity types: person, organization, concept, claim, methodology, finding, dataset, location, event, term, other
- Relationship types: supports, contradicts, related_to, derived_from, part_of, authored_by, references, defines, uses, causes, precedes, equivalent_to
- Tables: knowledge_entities, entity_mentions, entity_relationships, contradictions, graph_snapshots
- Vector embeddings (1024 dim) for semantic entity search
- RLS policies for workspace-scoped access

**Milestone:** "Here's everything your organization believes. Here are contradictions. Here are unsupported assumptions." ✅ (Backend complete)

---

## Phase 16: Global Search & Workspace Intelligence (Weeks 53-56) ✅

> **Priority: #6** — Makes the product a research brain

### 16.1 Cross-Project Search ✅
- [x] Unified search across all accessible workspaces (`/api/search`)
  - Search documents, sources, sections, entities, claims
  - Relevance ranking with excerpts
  - Filter by content type and workspace
- [x] Search page (`/search`) with:
  - Type filters (document, source, entity, section, claim)
  - Workspace selector
  - Real-time results with excerpts
- [x] Saved searches (`/api/search/saved`)
  - Save with custom names
  - Quick re-run from sidebar

### 16.2 Workspace Summaries ✅
- [x] AI-powered workspace summaries (`/api/workspaces/[id]/summary`)
  - Weekly/monthly/custom periods
  - Key findings extraction
  - Trend detection
  - Recommendations for next steps
- [x] Summary metrics: new documents, sources, entities, contradictions
- [x] Active users tracking

### 16.3 Activity Feed ✅
- [x] Workspace activity tracking (`/api/workspaces/[id]/activity`)
  - Record all workspace actions
  - Filter by target type
  - Paginated feed
- [x] Activity details with context

### 16.4 Notifications & Digests ✅
- [x] Notification system (`/api/notifications`)
  - List, mark read, dismiss, delete
  - Unread count badge
- [x] Notification preferences (`/api/notifications/preferences`)
  - Email settings: weekly summary, contradictions, mentions
  - In-app settings: contradictions, mentions, document changes
  - Digest day/time configuration
- [ ] Email delivery (requires email provider integration)
- [ ] Slack/Teams integration

**Database Migration:** `00005_search_and_summaries.sql`
- Tables: saved_searches, workspace_summaries, activity_feed, notification_preferences, notifications
- Helper functions: record_activity, get_workspace_activity, create_notification
- Full RLS policies

**Milestone:** ResearchBase becomes the "second brain" for research teams. ✅

---

## Phase 17: Opinionated Research Workflows (Weeks 57-60) ✅

> **Priority: #7** — Makes the platform sticky

### 17.1 Literature Review Pipeline ✅
- [x] Search → Screen → Extract → Synthesize workflow (`/api/research/literature-review`)
- [x] PRISMA flow with stage tracking (search, screen, extract, synthesize, complete)
- [x] Inclusion/exclusion criteria tracking (AI-generated from research question)
- [x] Source screening API (`/api/research/literature-review/[id]/screen`)
  - Manual screening with decisions (include/exclude/maybe/pending)
  - AI-powered auto-screening against criteria
  - Screening statistics and progress tracking
- [x] Quality assessment scoring

### 17.2 Research Templates ✅
- [x] Template system (`/api/research/templates`)
  - Types: experiment, hypothesis, methods, results, literature_review, abstract, discussion, custom
  - Configurable structure with AI prompts
  - Public/private templates
- [x] Hypothesis tracking (`/api/research/hypotheses`)
  - Statement and rationale capture
  - Status tracking (proposed/testing/supported/refuted/inconclusive)
  - AI-powered evaluation against sources
  - Supporting and contradicting evidence tracking

### 17.3 Argumentation Tools ✅
- [x] Argument mapping (`/api/research/arguments`)
  - Auto-generate from document content
  - Central claim identification
- [x] Argument nodes (`/api/research/arguments/[id]/nodes`)
  - Types: claim, premise, evidence, counterargument, rebuttal, conclusion
  - Pro/con/neutral stance tracking
  - Strength scoring
  - Position for visualization
- [x] Logical fallacy detection (`/api/research/fallacies`)
  - 15 fallacy types: ad_hominem, straw_man, false_dichotomy, etc.
  - Severity scoring (low/medium/high)
  - Suggestions for improvement
  - Overall argument quality scoring

### 17.4 Writing Workflows ✅
- [x] Writing projects (`/api/research/writing`)
  - Draft → Review → Revision → Finalize → Submitted → Published pipeline
  - Target journal/conference tracking
  - Deadline management
  - Word count targets
  - Academic writing checklist
- [x] AI-powered feedback (`/api/research/writing/[id]/feedback`)
  - Stage-specific feedback prompts
  - Types: ai_suggestion, peer_review, self_note
  - Structure, clarity, citation, argument, style, formatting analysis
  - Readiness scoring and next steps

**Database Migration:** `00006_research_workflows.sql`
- Tables: literature_reviews, review_sources, research_templates, hypotheses, argument_maps, argument_nodes, detected_fallacies, writing_projects, writing_feedback
- Enums: review_stage, screening_decision, template_type, argument_type, argument_stance, writing_stage
- Full RLS policies

**React Hook:** `useResearchWorkflows`
- Literature review management and screening
- Hypothesis creation and evaluation
- Argument map creation with auto-generation
- Writing project and feedback management
- Fallacy detection

**Milestone:** Domain-specific workflows for literature reviews, experiments, and academic writing. ✅

---

## Phase 18: Multi-Agent Reasoning (Weeks 61-64) ✅

> **Priority: #8** — AI-native, not just AI-enhanced

### 18.1 Specialized Agents ✅
- [x] Evidence Agent: Gathers relevant PDFs and excerpts
- [x] Fact-Checking Agent: Verifies claims against sources
- [x] Argument Agent: Structures and strengthens reasoning
- [x] Summarization Agent: Creates layered summaries
- [x] Contradiction Agent: Identifies conflicts
- [x] Agent definitions API (`/api/agents`)
  - Custom agent creation with configurable prompts
  - Model selection, temperature, max tokens
  - Capability flags: search_sources, search_entities, create_entities, modify_document

### 18.2 Agent Orchestration ✅
- [x] Agent pipelines (`/api/agents/pipelines`)
  - Multi-step pipeline definition
  - Input/output mapping between steps
  - Parallel execution groups
  - Trigger types: manual, on_document_save, scheduled
- [x] Agent execution (`/api/agents/execute`)
  - Context gathering based on capabilities
  - Structured reasoning with step tracking
  - Token usage tracking
  - Error handling with retry support
- [x] Execution history (`/api/agents/executions`)
  - Filter by agent, pipeline, status
  - Full execution details with traces

### 18.3 Transparent Reasoning ✅
- [x] Reasoning traces (`/api/agents/executions/[id]`)
  - Step-by-step thought process (thought, action, observation, conclusion)
  - Sources consulted tracking
  - Entities referenced tracking
  - Timing per step
- [x] Execution detail view with full trace
- [x] Cancel running execution support
- [ ] User intervention/redirect (UI pending)

### 18.4 Agent Disagreements ✅
- [x] Disagreement tracking (`/api/agents/disagreements`)
  - Capture conflicting agent conclusions
  - Topic and position recording
- [x] Resolution system
  - User manual resolution
  - AI arbitration agent (auto-resolve)
  - Resolution tracking with timestamp
- [x] Disagreement filtering (resolved/unresolved)

**Database Migration:** `00007_multi_agent.sql`
- Tables: agent_definitions, agent_pipelines, agent_executions, reasoning_traces, agent_handoffs, agent_disagreements
- Enums: agent_type (evidence, fact_checker, argument, summarizer, contradiction, research, writer, critic, custom), agent_status
- 5 default agents pre-seeded: Evidence Agent, Fact Checker, Argument Analyst, Summarizer, Contradiction Detector
- Full RLS policies

**React Hook:** `useAgents`
- Agent CRUD (create, update, delete custom agents)
- Pipeline management
- Execution with real-time trace tracking
- Disagreement management and resolution

**Milestone:** AI-native platform with transparent, multi-agent reasoning. ✅

---

## Phase 19: Velt Collaboration Migration (Current)

> **Priority: Active** — Replacing Yjs with production-ready collaboration SDK

### 19.1 Velt Core Setup ✅
- [x] Install Velt SDK packages
  - `@veltdev/react` - Core React SDK
  - `@veltdev/tiptap-velt-comments` - Tiptap integration
  - `@veltdev/tiptap-crdt-react` - CRDT support
- [x] Credentials stored in 1Password (`RB - Staging` vault, item: `Velt API Credentials`)
- [x] Environment variables configured
  - `NEXT_PUBLIC_VELT_API_KEY` in `.env.local`
  - `NEXT_PUBLIC_VELT_API_KEY` in Vercel production

### 19.2 Components Created ✅
- [x] `VeltProvider.tsx` - App wrapper with Velt context
- [x] `useVeltAuth.ts` - Supabase → Velt user sync hook
- [x] `VeltEditor.tsx` - Collaborative editor with:
  - TiptapVeltComments extension
  - BubbleMenu for inline comments
  - VeltPresence indicators
  - VeltCursor tracking
  - VeltCommentsSidebar
  - VeltNotificationsTool
  - All existing extensions preserved (Citation, AISpan, SlashCommand)
- [x] `VeltPresenceDisplay.tsx` - Enhanced presence UI

### 19.3 Activation Steps
- [x] Wrap app with VeltProvider in root layout (`app/layout.tsx`)
- [x] Update document pages to use VeltEditor
- [x] Run `supabase db push` to apply versioning migration
- [ ] Test real-time collaboration with multiple users
- [ ] Test comment creation and threads
- [ ] Verify presence indicators work

### 19.4 Yjs Deprecation (Future)
- [ ] Mark Yjs components as deprecated
- [ ] Remove Yjs WebSocket server dependency
- [ ] Uninstall Yjs packages:
  ```bash
  npm uninstall yjs y-websocket y-protocols @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor
  ```
- [ ] Archive old collaboration files:
  - `app/src/hooks/useCollaboration.ts`
  - `app/src/components/collaboration/CollaborativeEditor.tsx`

### 19.5 Velt User Object Shape
```typescript
interface VeltUser {
  userId: string       // Supabase user.id
  name: string         // user.user_metadata.full_name
  email: string        // user.email
  photoUrl?: string    // user.user_metadata.avatar_url
  organizationId?: string // workspace_id
}
```

### 19.6 Resources
- [Velt Documentation](https://docs.velt.dev)
- [Velt + Tiptap Guide](https://docs.velt.dev/tiptap)
- [Velt MCP](https://docs.velt.dev/mcp/mcp)

**Milestone:** Velt infrastructure ready. Pending: App integration and testing.

---

## Architecture Overview

```
[Browser: Next.js App]
  ├── Tiptap Editor (Velt collaboration)
  │     ├── VeltProvider context
  │     ├── VeltEditor with TiptapVeltComments
  │     ├── Presence indicators & cursors
  │     └── Comments sidebar
  ├── AI Actions (/summarize, /rewrite, personas)
  ├── Source Panel (PDF ingestion, evidence)
  ├── Ask-Project Sidebar
  ├── Arguments & Semantic Diff Panels
  ├── Version History (Git-style snapshots)
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
  ├── Realtime
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

[Velt API] — real-time collaboration, presence, comments
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
| `@veltdev/react` | Real-time collaboration SDK |
| `@veltdev/tiptap-velt-comments` | Tiptap comments integration |
| `@veltdev/tiptap-crdt-react` | CRDT synchronization |
| `@anthropic-ai/sdk` | Claude API |
| `voyageai` | Embedding API |
| `pdfjs-dist` | PDF text extraction |
| `react-pdf` | PDF viewing |
| `react-force-graph-2d` | Knowledge graph visualization |
| `tailwindcss` | Styling |
| `shadcn/ui` | Component library |
| `lucide-react` | Icon library |

### Legacy (Pending Removal)
| Package | Status |
|---------|--------|
| `yjs` | Being replaced by Velt |
| `y-websocket` | Being replaced by Velt |
| `@tiptap/extension-collaboration` | Being replaced by Velt |

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

### Immediate (UX Improvements)
1. ~~**Document tree sidebar** - Navigate documents within a project~~ ✅
2. ~~**Section navigation** - Jump to headings within a document~~ ✅
3. **Test Velt collaboration** - Multi-user editing, comments, presence

### Short-term (Polish)
4. **Test comments** - inline comments with @mentions
5. **Test presence** - cursor tracking and user indicators
6. **Onboarding flow** - First-time user experience
7. ~~**Jump to source** links in Ask-Project results~~ ✅

### Medium-term (Yjs Deprecation)
8. **Mark Yjs components deprecated**
9. **Shut down y-websocket server** on Hetzner
10. **Remove Yjs packages** from dependencies
11. **Archive old collaboration files**

### Completed Milestones
- [x] Phase 1-9: Foundation through Automations
- [x] Phase 10: Polish & UX improvements
- [x] Phase 11: Teams & Access Control
- [x] Phase 12: Research Data Import
- [x] Phase 13: Real-time AI Guardrails
- [x] Phase 14: Document Branching & Merging (Git-style versioning with DiffViewer)
- [x] Phase 15: Knowledge Graphing
- [x] Phase 16: Global Search & Intelligence
- [x] Phase 17: Research Workflows
- [x] Phase 18: Multi-Agent Reasoning
- [x] Phase 19.1-19.3: Velt collaboration activated

---

*This roadmap is a living document. Update as implementation progresses.*
