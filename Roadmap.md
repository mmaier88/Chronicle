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
- [ ] Install Tiptap with essential extensions
  - StarterKit, Placeholder, Typography
  - Heading, BulletList, OrderedList
  - CodeBlock, Blockquote, HorizontalRule
- [ ] Custom extensions for:
  - Citation marks
  - AI-generated span highlighting
  - Claim/assumption annotations

### 2.2 Yjs Multiplayer
- [ ] Set up Yjs provider with Supabase Realtime
- [ ] Cursor awareness (show collaborators)
- [ ] Conflict resolution strategy
- [ ] Branch-aware document state

### 2.3 Document Management UI
- [ ] Document tree sidebar
- [ ] Branch switcher
- [ ] Section navigation
- [ ] Version history panel

**Milestone:** Multiple users can edit the same document in real-time with branch support.

---

## Phase 3: Source Ingestion & Voyage Embeddings (Weeks 7-9)

### 3.1 PDF Processing Pipeline
- [ ] Edge Function: `embed_source`
  - Accept PDF upload
  - Extract text (pdf-parse or similar)
  - Chunk by paragraphs/pages (~500-1000 tokens)
  - Send to Voyage for embedding
  - Store in `source_chunks` table

### 3.2 Database: Sources & Chunks
```sql
-- sources: metadata, storage_path
-- source_chunks: content, page_number, embedding vector(1536)
-- IVFFlat index on embeddings
```

### 3.3 Source Panel UI
- [ ] PDF upload interface
- [ ] Source library (list all project sources)
- [ ] PDF viewer with page navigation
- [ ] Highlight search results in PDF

### 3.4 Evidence Retrieval
- [ ] Edge Function: `rag_find_evidence`
  - Embed query via Voyage
  - Vector similarity search in pgvector
  - Return top-k relevant chunks with source metadata
- [ ] "Find Evidence" button in editor
- [ ] Evidence panel showing relevant excerpts

**Milestone:** Users can upload PDFs, search for evidence, and see relevant source excerpts.

---

## Phase 4: Ask-Project & Document Memory (Weeks 10-12)

### 4.1 Document Section Embeddings
- [ ] Background job to embed document sections
- [ ] Table: `doc_section_embeddings`
- [ ] Trigger re-embedding on content changes (debounced)

### 4.2 Ask-Project Edge Function
- [ ] `ask_project` function:
  - Embed user query (Voyage)
  - Search both `source_chunks` AND `doc_section_embeddings`
  - Build context from top results
  - Send to Claude for synthesis
  - Return answer with citations

### 4.3 Ask-Project UI
- [ ] Sidebar panel for Ask-Project
- [ ] Query input with history
- [ ] Answer display with inline citations
- [ ] "Jump to source" links
- [ ] Contradiction highlighting

### 4.4 Cross-Document Search
- [ ] Search across all project documents
- [ ] Filter by document/branch
- [ ] Semantic similarity scores

**Milestone:** Users can ask questions about their entire project and get answers with citations.

---

## Phase 5: AI Writing Assistance (Weeks 13-15)

### 5.1 AI Text Edit Edge Function
- [ ] `ai_text_edit` supporting modes:
  - `summarize` - Condense selected text
  - `rewrite` - Improve clarity/style
  - `expand` - Add detail and depth
  - `shorten` - Make concise
  - `define` - Explain terms
  - `humanize` - Make more natural
  - `style_match` - Match reference style
  - `persona` - Write as specific voice
  - `obfuscate` - Anonymize content

### 5.2 Slash Commands
- [ ] Tiptap slash command extension
- [ ] `/summarize`, `/rewrite`, `/expand`, etc.
- [ ] Selection-based AI menu (right-click)

### 5.3 AI Provenance Tracking
- [ ] Table: `ai_jobs` (audit all AI calls)
- [ ] Table: `ai_spans` (track AI-generated text ranges)
- [ ] Visual indicator for AI-generated content
- [ ] "Humanize" action to remove AI markers

**Milestone:** Users can use slash commands to transform text with full provenance tracking.

---

## Phase 6: Citations & Verification (Weeks 16-18)

### 6.1 Citation System
- [ ] Table: `citations` with offset tracking
- [ ] Citation insertion UI (link text to source)
- [ ] Citation styles (APA, MLA, Chicago, etc.)
- [ ] Auto-format citations

### 6.2 Citation Verification
- [ ] Edge Function: `verify_citations`
  - For each citation, check if source supports claim
  - Detect: supported, outdated, contradictory
  - Store results in `citation_verification_runs`
- [ ] Verification status indicators in editor
- [ ] Batch verification for entire document

### 6.3 Citation Panel
- [ ] List all citations in document
- [ ] Verification status per citation
- [ ] Quick-fix suggestions for issues
- [ ] Export bibliography

**Milestone:** Full citation management with AI-powered verification.

---

## Phase 7: Argument Graph & Semantic Diff (Weeks 19-21)

### 7.1 Claim Extraction
- [ ] Edge Function: `extract_claim_graph`
  - Identify claims, assumptions, definitions
  - Extract relationships (supports, contradicts, depends_on, refines)
  - Score evidence strength
- [ ] Tables: `claims`, `claim_spans`, `claim_links`, `claim_evidence`

### 7.2 Argument Panel UI
- [ ] Visual claim network (graph view)
- [ ] Claim list with status indicators
- [ ] Evidence strength visualization
- [ ] Link claims to source evidence

### 7.3 Semantic Diff
- [ ] Edge Function: `semantic_diff`
  - Compare two branches conceptually
  - Identify: new claims, removed claims, modified arguments
  - Explain changes in natural language
- [ ] Diff viewer UI
- [ ] Side-by-side branch comparison
- [ ] AI-powered merge suggestions

**Milestone:** Users can visualize their argument structure and understand changes between versions.

---

## Phase 8: Safety & Hallucination Assessment (Weeks 22-24)

### 8.1 Document Risk Assessment
- [ ] Edge Function: `assess_document_safety`
  - Count unsupported claims
  - Identify outdated references
  - Detect unverifiable statements
  - Compute overall safety score
- [ ] Table: `doc_risk_assessments`

### 8.2 Safety Dashboard
- [ ] Safety score display (0-100)
- [ ] Hallucination risk indicator
- [ ] List of flagged statements
- [ ] Suggested fixes
- [ ] Trend over time

### 8.3 Real-time Safety Hints
- [ ] Inline warnings for risky statements
- [ ] "Find evidence" prompts for unsupported claims
- [ ] Citation suggestions

**Milestone:** Documents have safety scores with actionable improvement suggestions.

---

## Phase 9: Automations & Workflows (Weeks 25-27)

### 9.1 Workflow System
- [ ] Tables: `workflows`, `workflow_runs`
- [ ] Edge Function: `run_workflows` (cron-triggered)
- [ ] Workflow types:
  - `daily_index_refresh` - Re-embed updated sections
  - `weekly_exec_summary` - Generate project summary
  - `weekly_inconsistency_scan` - Find contradictions
  - `weekly_new_papers_digest` - Summarize new sources
  - `weekly_citation_check` - Verify all citations
  - `weekly_risk_assessment` - Update safety scores

### 9.2 Automation Panel UI
- [ ] Enable/disable workflows per project
- [ ] Configure schedules
- [ ] View run history
- [ ] Manual trigger option

### 9.3 Notifications
- [ ] Email digests
- [ ] In-app notifications
- [ ] Webhook integrations

**Milestone:** Projects maintain themselves with automated analysis and reporting.

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
