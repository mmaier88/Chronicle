# Chronicle - Features & Roadmap

**Last Updated:** 2026-01-09
**Version:** 2.0

---

## Overview

Chronicle is an AI-native book creation platform with two deployment targets:

| Component | Purpose | Stack | Deployment |
|-----------|---------|-------|------------|
| **Chronicle App** | Frontend + Vibe Flow | Next.js, Supabase | Vercel |
| **Chronicle Engine** | Autonomous long-form generation | Express, BullMQ, Prisma | Hetzner (138.199.231.3) |

---

## Feature Summary

### Shipped Features

#### Authentication & Users
- [x] Google OAuth login
- [x] Supabase Auth integration
- [x] User session management
- [x] Rate limiting (5 books/user/day)

#### Create Flow (`/create`)
- [x] **Genre selection** - Literary fiction (default)
- [x] **Prompt input** - Describe your story idea
- [x] **Surprise Me** - LLM-generated random story premises
- [x] **Book length picker** - 30/60/120/300 pages
- [x] **Preview generation** - Title, logline, blurb, cast, setting, promises
- [x] **Preview editing** - Edit all fields before generation
- [x] **Improve wording** - AI refinement of preview copy
- [x] **Regenerate** - Get a completely new preview
- [x] **Generation modes**:
  - Normal (draft) - Fast, ~1 min/section
  - Masterpiece Mode (polished) - Full editor pipeline, ~2-3 min/section

#### Book Generation Pipeline
- [x] **Constitution auto-generation** - AI derives book's internal rules
- [x] **Chapter planning** - Automatic structure based on length
- [x] **Section writing** - AI generates prose section by section
- [x] **Consistency checking** - Validates continuity (polished mode)
- [x] **Prose rewriting** - Fixes issues found (polished mode)
- [x] **Literary polish** - De-AI-ification pass (polished mode)
- [x] **Progress tracking** - Real-time status updates
- [x] **Error recovery** - Resume from failure point

#### Reading Experience
- [x] **Book reader** - Clean, minimal reading UI
- [x] **Table of contents** - Navigate by chapter
- [x] **TTS audio player** - Listen to generated books
- [x] **Continuous playback** - Seamless audio across chapters
- [x] **"Generated for you" badge** - Identifies AI-generated content

#### Author Flow (`/dashboard`) - For Writers
- [x] **Book creation** with genre selection
- [x] **Constitution editor** - 7 fields defining book's core identity:
  - Central thesis
  - Worldview frame
  - Narrative voice
  - What the book is against
  - What the book refuses to do
  - Ideal reader
  - Taboo simplifications
- [x] **Constitution lock** - Gates chapter creation
- [x] **Chapter scaffold** with meta fields (title, purpose)
- [x] **Section planning** with goals and constraints
- [x] **TipTap editor** with custom nodes:
  - `claim_block` - Key arguments/claims
  - `motif_block` - Recurring themes/images
  - `thread_block` - Plot threads
  - `note_block` - Author notes
- [x] **AI generation** within editor
- [x] **Draft/canonical system** - Visual distinction for versions
- [x] **Section promotion** - Mark as canonical
- [x] **Chapter locking** - Finalize chapters
- [x] **Embedding system** - Voyage AI for semantic search
  - Only canonical sections get embedded
  - Milestone-based embedding (v1, v2, final)
  - Chunking: 600-1200 tokens, ~100 overlap
- [x] **Consistency checking** - Detect contradictions, tone drift, constitution violations

#### Landing Page
- [x] Editorial aesthetic design
- [x] "Create Your Story" CTA
- [x] Google OAuth integration
- [x] Warm, literary visual style

---

### Chronicle Engine (Hetzner)

#### Core Architecture
- [x] **Multi-agent system**: Writer, Editor, Validator
- [x] **NarrativeState** - Tracks all story elements
- [x] **SceneFingerprint** - Deduplication via Jaccard similarity
- [x] **Checkpoint system** - Resumable generation
- [x] **BullMQ job queue** - Background processing

#### API Endpoints
- [x] `POST /v1/books` - Create generation job
- [x] `GET /v1/books/:id` - Get job status
- [x] `GET /v1/books/:id/manuscript` - Get final output
- [x] `GET /v1/books/:id/checkpoints` - Debug info
- [x] `GET /health` - Health check

#### Generation Modes
- [x] **Draft mode** - Writer only, no editor loop (fast)
- [x] **Polished mode** - Full Writer→Editor→Validator pipeline

#### Prose Quality Pipeline (Polished Mode)
- [x] **De-AI-ification rules**:
  - Concrete sensory imagery over abstract nouns
  - Dynamic sentence rhythm variance
  - End scenes on action/image, not moral conclusions
  - Dialogue with subtext, interruptions, micro-pauses
  - Character thoughts contain contradiction/uncertainty
- [x] **7-pass editorial refinement**:
  1. Structural tightening
  2. Line restraint (roughen "crafted" sentences)
  3. Dialogue subtext injection
  4. Character mess beats (2-4 imperfections per section)
  5. Motif governance
  6. Anti-aphorism sweep
  7. Rhythm pass
- [x] **Detection heuristics** for AI-sounding prose:
  - Theme-label sentences ("X disguised as Y")
  - Over-clean metaphor chains
  - Always-calm characters
  - Duplicate setup paragraphs
  - Motif overuse (>6 per 1000 words)

#### Infrastructure
- [x] Docker Compose deployment
- [x] PostgreSQL (Prisma)
- [x] Redis (BullMQ)
- [x] Caddy reverse proxy with TLS

---

## Product Vision

**Core Promise:** *"You can finally read the exact book you've always wanted."*

Chronicle isn't just a creation tool—it's a content network where every reader becomes an author of their own perfect story.

**Growth Loop:**
1. User discovers a book → reads/listens
2. Thinks "I want something like this, but..." → creates their own
3. Shares it → brings new readers → repeat

---

## Roadmap

### Phase 14: Book Export & Sharing (Complete)

| Feature | Priority | Status |
|---------|----------|--------|
| PDF export | High | Done |
| EPUB export | High | Done |
| AI cover generation (Google Gemini) | High | Done |
| Cover regeneration | High | Done |
| Shareable links (public read + listen) | High | Done |
| Send to Kindle (EPUB + web upload) | High | Done |

### Phase 14.5: Email Notifications (Complete)

**Goal:** Transactional emails via SendGrid from hello@chronicle.town

| Feature | Priority | Status |
|---------|----------|--------|
| Welcome email on signup | High | Done |
| Book completion notification | High | Done |
| Email templates (branded) | Medium | Done |

### Phase 14.6: Staging Environment (Complete)

**Goal:** Proper staging/production separation for safe testing before production deploys.

| Component | Production | Staging |
|-----------|------------|---------|
| Vercel | `chronicle.town` (main branch) | `staging.chronicle.town` (staging branch) |
| Supabase | `ambrhrajlgogvfysztrw` | `lckwlokaarkevrjraxax` |
| Hetzner Engine | `138.199.231.3:80` | `138.199.231.3:3001` |

| Task | Status |
|------|--------|
| Create staging Supabase project | Done |
| Run migrations on staging | Done |
| Configure Vercel environment scoping | Done |
| Set up staging Engine on port 3001 | Done |
| Create staging branch | Done |
| Add staging.chronicle.town DNS | Done |
| Configure Google OAuth for staging | Done |

---

### Phase 14.8: Testing Infrastructure (Complete)

**Goal:** Prevent frontend/backend contract mismatches and catch regressions before they reach production.

#### Components

| Component | Purpose | Status |
|-----------|---------|--------|
| **Typed API Client** | Shared types between frontend/backend, TypeScript catches mismatches at compile time | Done |
| **GitHub Actions CI** | Run tests automatically on every push, block deploys on failure | Done |
| **API Integration Tests** | Verify API routes return expected shapes and handle errors | Done |
| **E2E Tests (Playwright)** | Test real user flows: create → preview → generate | Done |

#### Implementation Tasks

| Task | Priority | Status |
|------|----------|--------|
| Create `/lib/api-client.ts` with typed fetch wrappers | High | Done |
| Add `.github/workflows/test.yml` for CI | High | Done |
| Integration tests for `/api/create/preview` | High | Done |
| Integration tests for `/api/create/job` | High | Done |
| Integration tests for `/api/share/create` | Medium | Done |
| Install Playwright + configure | High | Done |
| E2E: Smoke tests (landing, login, navigation) | High | Done |
| E2E: Create flow (auth redirect) | High | Done |
| E2E: Login flow (Google OAuth mock) | Medium | Planned |
| E2E: Authenticated create flow | Medium | Planned |

---

### Phase 14.7: Story Slider System (Complete)

**Goal:** Give users control over story tone, content, and style through an intuitive slider system with 3 visible labels mapping to 5-step internal precision.

#### User-Facing Design
- **3 Default Sliders**: Violence, Romance, Tone (visible on create page)
- **3 Human Labels**: Minimal → Balanced → Extreme (no numbers)
- **Advanced Mode**: Expands to show all 14 sliders
- **Internal Mapping**: User labels → 1/3/5 scale, untouched → "auto"

#### Default Sliders (Always Visible)

| Slider | Labels | Internal Mapping |
|--------|--------|------------------|
| Violence | Minimal → Balanced → Extreme | 1 → 3 → 5 |
| Romance | Minimal → Balanced → Extreme | 1 → 3 → 5 |
| Tone | Hopeful → Bittersweet → Tragic | 1 → 3 → 5 |

#### Advanced Sliders (Collapsed by Default)

| Slider | Purpose |
|--------|---------|
| Darkness | Overall bleakness/heaviness |
| Emotional Intensity | Depth of emotional beats |
| Language Complexity | Vocabulary/sentence sophistication |
| Plot Complexity | Twists, subplots, narrative layers |
| Pacing | Slow burn vs rapid progression |
| Realism | Grounded vs fantastical logic |
| World Detail | Environmental/setting richness |
| Character Depth | Interior life complexity |
| Moral Clarity | Clear heroes/villains vs gray |
| Shock Value | Unexpected/provocative moments |
| Explicit Content Safeguard | Content ceiling enforcement |

#### Implementation Tasks

| Task | Priority | Status |
|------|----------|--------|
| Types in `chronicle.ts` | High | Done |
| SliderControl UI component (`StorySliders.tsx`) | High | Done |
| Config (`slider-config.ts`) | High | Done |
| Create page integration (3 default sliders) | High | Done |
| Preview page integration | High | Done |
| Advanced mode toggle | Medium | Done |
| Auto-resolution logic (`slider-resolution.ts`) | High | Done |
| LLM prompt injection (constraint block in tick) | High | Done |
| Safety/conflict resolution | High | Done |

---

### Phase 15: Discovery & Public Library

**Goal:** Transform Chronicle from a creation tool into a content network. Users should be able to browse and discover stories, not just create them.

| Feature | Priority | Status |
|---------|----------|--------|
| Public library page (`/library`) | High | Planned |
| Browse by genre, mood, length | High | Planned |
| Search books (title, blurb, tags) | High | Planned |
| Featured/staff picks section | High | Planned |
| Trending books (by views/likes) | Medium | Planned |
| "For You" personalized feed | Medium | Planned |
| Book detail pages with cover, blurb, stats | High | Planned |
| Anonymous reading (no signup required) | High | Planned |

### Phase 16: Social & Engagement

**Goal:** Build social proof loops that drive viral growth. Share → signup → create → share.

| Feature | Priority | Status |
|---------|----------|--------|
| Author/creator profiles | High | Planned |
| Follow authors | High | Planned |
| Like/save books to library | High | Planned |
| Ratings (1-5 stars) | Medium | Planned |
| Reader reviews/comments | Medium | Planned |
| Activity feed ("X just created...") | Medium | Planned |
| Share cards (OG images for social) | High | Planned |
| "Create something like this" CTA | High | Planned |
| Invite friends / referral program | Low | Planned |

### Phase 17: Retention & Habits

**Goal:** Prevent one-and-done usage. Bring users back daily.

| Feature | Priority | Status |
|---------|----------|--------|
| Daily story prompt ("Today's inspiration") | High | Planned |
| Reading streaks | High | Planned |
| Achievements/badges | Medium | Planned |
| "Continue reading" / reading history | High | Planned |
| "Your next story" recommendations | High | Planned |
| Weekly digest email | Medium | Planned |
| Push notifications (web) | High | Planned |
| Reading goals (books per month) | Low | Planned |

### Phase 18: Mobile Experience

**Goal:** B2C reading is mobile-first. Audio is a massive advantage—lean into it.

| Feature | Priority | Status |
|---------|----------|--------|
| PWA install prompts | High | Planned |
| Offline reading cache | High | Planned |
| Push notifications (mobile) | High | Planned |
| Enhanced audio player (speed, skip, sleep timer) | High | Planned |
| Background audio playback | High | Planned |
| Swipe gestures for navigation | Medium | Planned |
| Dark/light/sepia reading themes | Medium | Planned |
| iOS native app | Medium | Future |
| Android native app | Medium | Future |

### Phase 19: Remix (Edit & Republish)

**Goal:** Allow users to edit existing generated stories and republish them.

| Feature | Priority | Status |
|---------|----------|--------|
| Open story in editor | High | Planned |
| Edit chapters/sections | High | Planned |
| Regenerate specific sections | High | Planned |
| Republish with changes | High | Planned |
| Fork/duplicate story | Medium | Planned |
| Version history | Medium | Planned |
| Merge edits with regeneration | Low | Planned |

### Phase 20: Monetization

**Goal:** Monetize after building engaged user base. Focus on retention first.

| Feature | Priority | Status |
|---------|----------|--------|
| Subscription tiers (Free/Pro/Unlimited) | High | Planned |
| Pay-per-book credits | High | Planned |
| Masterpiece Mode as premium | High | Planned |
| Free tier with daily limits | High | Planned |
| Unlimited generation tier | Medium | Planned |
| API access tier | Low | Planned |

### Phase 21: Extended Formats

| Feature | Priority | Status |
|---------|----------|--------|
| Full-length novels (300+ pages) | High | Planned |
| Screenplay generation | Medium | Planned |
| Interactive fiction | Low | Future |
| Choose-your-own-adventure | Low | Future |

### Phase 22: Advanced Features

| Feature | Priority | Status |
|---------|----------|--------|
| Style/voice presets | High | Planned |
| Character persistence across books | Medium | Planned |
| Series generation | Medium | Planned |
| World-building templates | Medium | Planned |
| Genre-specific optimizations | Low | Planned |

---

## Technical Debt & Improvements

### Critical (Testing - Phase 14.8)
- [x] Test framework setup (Vitest)
- [x] Typed API client (compile-time contract safety)
- [x] GitHub Actions CI pipeline
- [x] API route integration tests (61 tests)
- [x] E2E tests (Playwright smoke tests)
- [ ] Database RLS policy tests
- [ ] Authenticated E2E flows

### High Priority
- [x] Structured logging (`lib/logger.ts`) - Partial
- [x] Environment validation (`lib/env.ts`)
- [x] Performance indexes (migrations 00005, 00006)
- [ ] Correlation IDs in logs
- [ ] Error alerting (PagerDuty/Slack)
- [ ] Generation cost tracking per user
- [ ] Analytics dashboard

### Medium Priority
- [ ] OpenAI fallback for LLM calls
- [ ] A/B testing framework
- [ ] Performance monitoring (Vercel Analytics)
- [x] Standardize API response format (`lib/api-utils.ts`)
- [ ] Add ARIA labels for accessibility

### Low Priority
- [ ] Multi-region deployment
- [ ] Real-time collaboration
- [ ] Version control for manuscripts
- [ ] HTML sanitization with DOMPurify

---

## Out of Scope (V2)

These features are explicitly deferred:

- Multi-author collaboration
- Real-time co-editing
- Translation/localization
- Audiobook narration (human voice)
- Physical book printing integration
- NFT/blockchain anything

---

## Environment Variables

### Vercel (Chronicle App)

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY     # Supabase service role key
ANTHROPIC_API_KEY             # Claude API key
```

**Optional (features disabled if missing):**
```
GOOGLE_API_KEY                # Cover generation (Gemini)
ELEVENLABS_API_KEY            # Text-to-speech
SENDGRID_API_KEY              # Transactional emails
VOYAGE_API_KEY                # Embeddings for semantic search
NEXT_PUBLIC_APP_URL           # Production URL (https://chronicle.town)
```

**Security:**
```
SUPABASE_WEBHOOK_SECRET       # Webhook authentication (required in prod)
CRON_SECRET                   # Cron job authentication
```

### Hetzner (Chronicle Engine)
```
DATABASE_URL
REDIS_HOST
REDIS_PORT
ANTHROPIC_API_KEY
```

---

## API Reference

### Create Flow APIs (Vercel)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/create/preview` | POST | Generate book preview |
| `/api/create/job` | POST | Start generation job |
| `/api/create/job/[id]/tick` | POST | Advance job one step |
| `/api/create/job/[id]/status` | GET | Get job progress |
| `/api/create/surprise` | POST | Generate random prompt |

### Author Flow APIs (Vercel)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/generate` | POST | Generate prose |
| `/api/ai/consistency` | POST | Check consistency |
| `/api/ai/polish` | POST | Polish prose |
| `/api/embed` | POST | Generate embeddings |
| `/api/books/[id]/constitution/lock` | POST | Lock constitution |
| `/api/books/[id]/chapters/[ch]/lock` | POST | Lock chapter |
| `/api/books/[id]/chapters/[ch]/sections/[s]/promote` | POST | Promote section |

### Engine APIs (Hetzner)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/books` | POST | Create book job |
| `/v1/books/:id` | GET | Get job status |
| `/v1/books/:id/manuscript` | GET | Get manuscript |
| `/v1/books/:id/checkpoints` | GET | Get checkpoints |
| `/health` | GET | Health check |

---

## Changelog

### 2026-01-09
- **Phase 14.8 complete: Testing Infrastructure**
  - Typed API client (`lib/api-client.ts`) - compile-time contract safety
  - GitHub Actions CI pipeline (runs on push to main/staging)
  - 61 unit/integration tests for API utilities and client
  - Playwright E2E smoke tests (landing, login, navigation)
- **Phase 14.7 confirmed complete: Story Slider System**
  - All 14 sliders implemented with UI, config, resolution, and LLM injection
- Fixed Google OAuth showing 2 screens (removed consent prompt)
- Fixed create page not progressing (API response format mismatch)
- Fixed Surprise Me feature (standardized API response format)

### 2026-01-08
- Phase 14.6 complete: Staging Environment
- Created staging Supabase project (lckwlokaarkevrjraxax)
- Configured Vercel Preview environment with staging Supabase keys
- Added staging Engine on Hetzner port 3001
- Created staging branch for deployment
- Added Send to Kindle button with mobile share sheet support
- Added synopsis to story cards on /create and /stories pages

### 2026-01-07
- **Roadmap restructure**: Prioritized Discovery, Social & Retention
  - Added Phase 15: Discovery & Public Library
  - Added Phase 16: Social & Engagement (expanded)
  - Added Phase 17: Retention & Habits (new)
  - Elevated Phase 18: Mobile Experience
  - Added Product Vision section with core promise
- Cover generation now triggers early (at constitution step)
- Covers generate in parallel with book writing
- Custom auth domain: auth.chronicle.town
- Markdown rendering fix (*italic* and **bold**)
- Share URLs now use production domain
- Phase 14.5 complete: Email Notifications
- SendGrid integration for transactional emails
- Welcome email on user signup
- Book completion notification email
- Branded email templates from hello@chronicle.town
- Phase 14 complete: Book Export & Sharing
- AI cover generation using Google Gemini (Nano Banana)
- Cover regeneration from book page
- Shareable links with public read + listen access
- Client-side PDF export (jsPDF)
- Client-side EPUB export (epub-gen-memory)
- BookCover, ShareButton, ExportButton components
- Database migration for covers and share tokens

### 2026-01-06
- Added "Surprise Me" LLM-powered random prompts
- Added Normal/Masterpiece Mode toggle
- Renamed `/vibe` routes to `/create`
- TTS audio player with continuous playback
- Landing page with Google OAuth

### 2026-01-05
- Chronicle Engine deployed to Hetzner
- Draft mode (2x faster generation)
- Fixed Zod schema validation issues

### 2025-12-18
- Prose quality improvements (de-AI-ification)
- Last 10% literary polish pipeline
- 7-pass editorial refinement

### 2025-12-17
- Vibe Flow complete (V2)
- Author Flow complete (V1)
- Initial production deployment
