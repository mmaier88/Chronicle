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
| **App Server** | Hetzner cx42 | `138.199.231.3` / `2a01:4f8:c014:86e8::/64` (fsn1) |
| **Backend** | Supabase | Postgres + pgvector, Auth, Storage, Realtime, Edge Functions |
| **LLM** | Anthropic Claude | Reasoning, generation, verification |
| **Embeddings** | Voyage AI | Document & query embeddings (1536 dim) |
| **Secrets** | 1Password | Service account for CI/CD and server secrets |

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
- [ ] Configure OAuth providers (Google, GitHub)
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
- [ ] Set up Yjs provider with Supabase Realtime
- [ ] Cursor awareness (show collaborators)
- [ ] Conflict resolution strategy
- [ ] Branch-aware document state

### 2.3 Document Management UI
- [x] Document page with editor (`/documents/[id]`)
- [x] Quick actions on dashboard
- [ ] Document tree sidebar
- [ ] Branch switcher
- [ ] Section navigation
- [ ] Version history panel

**Milestone:** Editor functional with formatting. Multiplayer pending Yjs integration.

---

## Phase 3: Source Ingestion & Voyage Embeddings (Weeks 7-9)

### 3.1 PDF Processing Pipeline
- [x] API endpoint: `/api/sources/upload`
  - Accept PDF upload
  - Store in Supabase Storage
  - Create source record in database
- [x] API endpoint: `/api/sources/[id]/process`
  - Extract text (pdf-parse)
  - Chunk by paragraphs (~1000 chars)
  - Generate embeddings via Voyage AI
  - Store in `source_chunks` table
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
- [ ] PDF viewer with page navigation
- [ ] Highlight search results in PDF

### 3.4 Evidence Retrieval
- [ ] Edge Function: `rag_find_evidence`
  - Embed query via Voyage
  - Vector similarity search in pgvector
  - Return top-k relevant chunks with source metadata
- [ ] "Find Evidence" button in editor
- [ ] Evidence panel showing relevant excerpts

**Milestone:** PDF upload and embedding pipeline ready. Evidence retrieval pending.

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
- [ ] Claude integration for answer synthesis

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

**Milestone:** Ask-Project functional with source search. Document memory and Claude synthesis pending.

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
- [ ] Citation styles (APA, MLA, Chicago, etc.)
- [ ] Auto-format citations

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
- [ ] Export bibliography

**Milestone:** Citation system functional with AI-powered verification. Requires `ANTHROPIC_API_KEY` to enable verification.

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
- [ ] Edge Function: `run_workflows` (cron-triggered)
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

**Milestone:** Workflow UI functional. Enables project owners to configure automated workflows. Backend execution pending Edge Functions.

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
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Mobile responsive design
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

**Milestone:** Production-ready application.

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

[Hetzner cx42 - 138.199.231.3]
  └── Next.js App Server (pm2 / Docker)
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
- **Infrastructure:** Hetzner + Supabase (managed)
- **AI Services:** Anthropic + Voyage (API keys configured)
- **Estimated Timeline:** 30 weeks to v1.0

---

## Next Steps

1. **Week 1:** Server setup and Supabase project creation
2. **Week 2:** Database schema migration
3. **Week 3:** Next.js scaffold with auth
4. **Week 4:** Begin Tiptap editor integration

---

*This roadmap is a living document. Update as implementation progresses.*
