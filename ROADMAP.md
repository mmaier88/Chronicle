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

### Phase 14.9: Payment System (Complete)

**Goal:** Implement pay-per-book pricing with Stripe. Two editions, four lengths. Free tier for short stories.

#### Pricing Model

**Standard Edition** - A great custom-written book. Text only, yours forever, giftable.
| Length | Pages | Price |
|--------|-------|-------|
| Short Book | ~30 | **FREE** |
| Book | ~60 | $3.99 |
| Long Book | ~120 | $6.99 |
| Epic Book | ~300 | $9.99 |

**Masterwork Edition** - The definitive edition. Refined prose & cohesion, audio included (up to 15 hrs), yours forever, giftable.
| Length | Pages | Price |
|--------|-------|-------|
| Short Book | ~30 | $4.99 |
| Book | ~60 | $7.99 |
| Long Book | ~120 | $11.99 |
| Epic Book | ~300 | $14.99 |

#### Implementation Tasks

| Task | Priority | Status |
|------|----------|--------|
| Create Stripe account & products | High | Done |
| Create 8 Stripe Price objects (4 lengths × 2 editions) | High | Done |
| Add `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` env vars | High | Done |
| Install `stripe` and `@stripe/stripe-js` packages | High | Done |
| Create `/api/payments/create-checkout` endpoint | High | Done |
| Create `/api/payments/webhook` for Stripe events | High | Done |
| Add `payments` table (user_id, stripe_session_id, amount, status, book_id) | High | Done |
| Update create flow: edition selector UI (Standard/Masterwork) | High | Done |
| Update create flow: show price based on length + edition | High | Done |
| Redirect to Stripe Checkout before generation starts | High | Done |
| Handle successful payment → start generation job | High | Done |
| Handle failed/canceled payment | High | Done |
| Free tier for Standard short stories | High | Done |
| Add payment status to book record | Medium | Done |
| Receipt emails via Stripe | Medium | Planned |
| Refund handling | Low | Planned |

#### Technical Notes
- Stripe API credentials in 1Password
- Use Stripe Checkout (hosted) for PCI compliance
- Webhook signature verification required
- Map: Standard Edition = draft mode, Masterwork Edition = polished mode + TTS
- Free tier: Standard 30-page books skip Stripe, create job directly

---

### Phase 14.10: Chronicle Reader V1 (Complete)

**Goal:** Immersive full-screen reading experience with progress tracking and typography controls.

#### Features

| Feature | Status |
|---------|--------|
| Full-screen immersive reader (no nav bar) | Done |
| Progress tracking (scroll percentage) | Done |
| Perfect resume (remembers scroll position) | Done |
| Typography controls (tap to show) | Done |
| Font size adjustment | Done |
| Line height adjustment | Done |
| Font family (serif/sans) | Done |
| Theme selection (light/dark/warm-night) | Done |
| "Listen from here" button | Done |
| Progress bar always visible | Done |
| Time remaining estimate | Done |

#### Technical Implementation

- Separate route group `/(reader)` with minimal layout
- Reader page at `/reader/[bookId]`
- Progress saved to `reader_progress` table
- Typography saved to `typography_settings` table
- Raw section content preserved for rendering (matches old reader)
- Scroll position restored on load via `scroll_offset_ratio`

#### Database Tables

```sql
-- Reader progress (per user × book)
reader_progress (user_id, book_id, chapter_id, paragraph_id, scroll_offset, scroll_offset_ratio)

-- Typography settings (per user)
typography_settings (user_id, font_size, line_height, font_family, theme)
```

#### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reader/book/[bookId]` | GET | Get book content in reader format |
| `/api/reader/progress` | POST | Save reading progress |
| `/api/reader/typography` | GET/POST | Get/save typography settings |

---

### Phase 14.11: Voice Mode (Audio Path) - STAGING ONLY

**Goal:** Voice-based story creation interface. Users speak instead of type to create their story. Same output, different input modality.

**Status:** In Progress (Staging Only)

#### Core Concept

Voice Mode is an alternative interface to the existing `/create/new` flow. Instead of typing a prompt and selecting options, users have a natural conversation with an AI agent that:
1. Asks what kind of story they want
2. Explores their preferences (length, tone, themes)
3. Confirms the concept
4. Passes structured data to the existing preview flow

**Route:** `/create/audio` → speaks with ElevenLabs agent → redirects to `/create/preview`

#### ElevenLabs Integration

**SDK:** `@elevenlabs/react` with `useConversation` hook
**Connection:** WebRTC for low-latency real-time audio
**Authentication:** Signed URLs from `/api/voice/signed-url`

#### Agent Configuration (ElevenLabs Dashboard)

**System Prompt:**
```
You are Chronicle's story guide. Your job is to help users discover and articulate the story they want to read.

CONVERSATION FLOW:
1. Greet warmly and ask what kind of story they're in the mood for
2. Listen and reflect back what you heard, adding creative flourishes
3. Ask about length preference (short story ~30 pages, novella ~60, novel ~120, epic ~300)
4. Gently explore tone/mood preferences (hopeful vs tragic, high vs low violence, romantic elements)
5. Summarize the concept back to them for confirmation
6. When confirmed, call the `createStoryPreview` tool with extracted data

PERSONALITY:
- Warm, curious, literary
- Never clinical or transactional
- Speak like a thoughtful friend who loves books
- Keep responses concise (2-3 sentences max unless elaborating on their idea)
- Use "we" language ("Let's explore...", "We could take this...")

CONSTRAINTS:
- Only gather story information, never discuss Chronicle features/pricing
- If they ask off-topic questions, gently redirect to their story
- Minimum viable data: prompt (their story idea as a sentence or two)
- Default length: 30 pages if not specified
- Default preferences: "auto" for all sliders if not discussed
```

**Voice:** Aurora (warm, expressive female voice) or Marcus (deep, engaging male voice)

**Client Tool - `createStoryPreview`:**
```typescript
{
  name: "createStoryPreview",
  description: "Called when user confirms their story concept. Creates the preview.",
  parameters: {
    prompt: { type: "string", description: "1-5 sentence story concept" },
    length: { type: "number", enum: [30, 60, 120, 300], description: "Target page count" },
    tone: { type: "string", enum: ["auto", "hopeful", "bittersweet", "tragic"], optional: true },
    violence: { type: "string", enum: ["auto", "minimal", "balanced", "extreme"], optional: true },
    romance: { type: "string", enum: ["auto", "minimal", "balanced", "extreme"], optional: true }
  }
}
```

#### Implementation Tasks

| Task | Priority | Status |
|------|----------|--------|
| Create ElevenLabs agent in dashboard | High | Planned |
| Configure agent system prompt and tools | High | Planned |
| Install `@elevenlabs/react` package | High | Planned |
| Create `/api/voice/signed-url` endpoint | High | Planned |
| Create `/create/audio` page with voice UI | High | Planned |
| Implement `createStoryPreview` client tool | High | Planned |
| Add microphone permission flow | High | Planned |
| Handle conversation-to-preview data flow | High | Planned |
| Add visual feedback (speaking/listening states) | Medium | Planned |
| Add fallback for browsers without mic support | Medium | Planned |
| Test on staging environment | High | Planned |
| Add link from `/create` page (staging only) | High | Planned |

#### Technical Implementation

**Frontend (`/create/audio/page.tsx`):**
```typescript
// Core flow
1. Request microphone permission
2. Get signed URL from /api/voice/signed-url
3. Start ElevenLabs conversation with agentId
4. Listen for `createStoryPreview` client tool call
5. When called: store data in localStorage, redirect to /create/preview
```

**Backend (`/api/voice/signed-url/route.ts`):**
```typescript
// Generate signed URL for authenticated conversation
1. Verify user is authenticated
2. Call ElevenLabs API to generate signed URL
3. Return URL with short TTL
```

**Environment Variables:**
```
ELEVENLABS_API_KEY          # Already exists
ELEVENLABS_AGENT_ID         # New: Agent ID from dashboard
```

#### UI Design

**States:**
1. **Idle** - "Tap to start talking" button
2. **Connecting** - Loading spinner
3. **Listening** - Pulsing microphone, "I'm listening..."
4. **Speaking** - Audio waveform, agent's words displayed
5. **Processing** - "Creating your preview..." then redirect

**Visual Style:**
- Full-screen dark background
- Central floating orb that pulses with audio
- Minimal text, maximum voice interaction
- Matches Chronicle's warm night aesthetic

#### Acceptance Tests

1. User grants mic permission → conversation starts
2. User describes story → agent reflects and asks follow-ups
3. User confirms concept → redirects to preview with correct data
4. User denies mic → shows fallback to text input
5. Connection drops → graceful error with retry option

#### Notes

- **Staging only**: Feature flag `NEXT_PUBLIC_VOICE_MODE_ENABLED=true` on staging
- **Same backend**: No engine changes needed, just a new input interface
- **Cost tracking**: ElevenLabs Conversational AI charged per minute
- **Privacy**: Audio is processed by ElevenLabs, not stored by Chronicle

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

#### Strategy: Capacitor (Recommended)

Capacitor wraps the existing Next.js app in a native shell, giving us App Store presence + native capabilities with minimal code changes. Updates deploy via OTA (no app store review for web content changes).

| Approach | Effort | Result |
|----------|--------|--------|
| PWA | 1-2 days | Add to home screen, limited iOS audio |
| **Capacitor** | 1-2 weeks | App Store apps, native APIs, OTA updates |
| React Native | 1-3 months | Full rewrite required |

#### Implementation Tasks

| Task | Priority | Status |
|------|----------|--------|
| **Phase 18.1: PWA Foundation** | | |
| Add `manifest.json` with app icons | High | Planned |
| Add service worker for offline caching | High | Planned |
| PWA install prompts | High | Planned |
| Test background audio on iOS/Android | High | Planned |
| **Phase 18.2: Capacitor Setup** | | |
| Install Capacitor (`@capacitor/core`, `@capacitor/cli`) | High | Planned |
| Initialize iOS and Android projects | High | Planned |
| Configure `capacitor.config.ts` | High | Planned |
| Set up app icons and splash screens | High | Planned |
| Configure deep linking | Medium | Planned |
| **Phase 18.3: Native Features** | | |
| Background audio playback (Capacitor plugin) | High | Planned |
| Push notifications (`@capacitor/push-notifications`) | High | Planned |
| Offline reading cache (service worker + Capacitor) | High | Planned |
| Download audio for offline listening | High | Planned |
| Share sheet integration | Medium | Planned |
| Haptic feedback | Low | Planned |
| **Phase 18.4: App Store Deployment** | | |
| Apple Developer Account setup | High | Planned |
| Google Play Developer Account setup | High | Planned |
| App Store listing (screenshots, description) | High | Planned |
| TestFlight beta distribution | High | Planned |
| Play Store internal testing | High | Planned |
| Production release (iOS) | High | Planned |
| Production release (Android) | High | Planned |
| **Phase 18.5: OTA Updates** | | |
| Set up Capgo or self-hosted OTA | Medium | Planned |
| Configure update checking on app launch | Medium | Planned |
| Silent background updates | Medium | Planned |

#### Reader Enhancements (All Platforms)

| Feature | Priority | Status |
|---------|----------|--------|
| Enhanced audio player (speed, skip, sleep timer) | High | Planned |
| Swipe gestures for navigation | Medium | Planned |
| Dark/light/sepia reading themes | Medium | Done |
| Reading progress sync across devices | High | Done |

#### Technical Notes

- **Build command:** `npm run build && npx cap sync`
- **OTA updates:** 90% of updates ship without app store review
- **Native rebuilds required for:** New Capacitor plugins, permission changes, app icon changes
- **Audio:** Use `@nicholasbraun/capacitor-background-audio` or similar for true background playback

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

### Phase 20: Subscription & Credits System (CANONICAL SPEC)

**Goal:** Subscription model that feels like Audible/Kindle, not SaaS. Credits are explicit and visible, never technical.

#### Core Product Truth
- Chronicle sells **custom books**, not AI tools
- No tokens, no model names, no compute language
- Users must understand the system in < 10 seconds

---

#### Plan: Chronicle Unlimited+ — $9.99/month

**Includes:**
- Unlimited reading of books created by others
- Unlimited listening to books created by others
- **15 hours of listening per month** (global pool)
- **10 creation credits per month**
- **Masterwork always included** (no credit penalty)

Cancel anytime.

---

#### Credit System

| What you create | Credits used |
|-----------------|--------------|
| Short Story | 1 credit |
| Book | 2 credits |
| Long Book | 4 credits |
| Epic Book | 10 credits |

**Rules:**
- Credits are integers only (no decimals)
- Masterwork costs same credits as Standard
- Pages shown only as descriptive text, not pricing mechanic

**Rollover:**
- Credits roll over while subscription active
- Maximum cap: **30 credits**
- On billing cycle: +10 credits, clamp to 30

**Cancellation:**
- ALL unused credits forfeited (matches Audible)
- UX copy: "Unused credits are available while your subscription is active."

---

#### Purchased Credits

- Price: **$0.999 per credit** (same as subscription rate)
- Packs: +10 ($9.99), +20 ($19.98), +50 ($49.95)
- Subject to same 30-credit cap
- Forfeited on cancellation

---

#### Audio / Listening System

- **15 hours per month** (resets monthly, no rollover)
- Applies to: own books + others' books
- At cap: pause playback, offer upsell "+5 hours for $1.99"
- Stream on demand, generate audio lazily

---

#### Ownership & Access

| Content | While Subscribed | After Cancel |
|---------|------------------|--------------|
| Books you created | Full access | Full access (owned forever) |
| Others' books | Full access | Lost |

---

#### Implementation Tasks

| Task | Priority | Status |
|------|----------|--------|
| Stripe subscription product setup | High | Planned |
| `user_subscriptions` table (status, cycle dates) | High | Planned |
| `credits_balance` field (int, max 30) | High | Planned |
| `listening_seconds_remaining` field | High | Planned |
| Monthly cron: grant credits, reset listening | High | Planned |
| Subscription page UI ($9.99/mo, benefits) | High | Planned |
| Credit purchase flow (Stripe one-time) | High | Planned |
| Creation flow: show "Uses X credits" | High | Planned |
| Audio player: track listened seconds | High | Planned |
| Audio overage upsell modal | Medium | Planned |
| Cancellation: forfeit credits | High | Planned |
| Webhook: handle subscription lifecycle | High | Planned |

#### UI Requirements

**Must show:**
- "$9.99 / month"
- "10 creation credits per month"
- "Credits roll over up to 30 while subscribed"
- "15 hours of listening per month"
- "Masterwork included"

**Never show:**
- Tokens, model names, multipliers
- Credit expiration timers
- Decimals

#### Canonical UX Copy
- "You get 10 creation credits every month."
- "Credits roll over while you're subscribed — up to 30."
- "Use credits however you like: one epic book or several smaller ones."
- "Masterwork is included."
- "Listening time resets every month."

---

#### Acceptance Tests

1. User subscribes → sees 10 credits, 15h audio
2. User inactive 2 months → sees 30 credits (cap)
3. User buys +20 credits → balance clamps to 30
4. User creates epic book → spends 10 credits
5. User cancels → credits reset to 0
6. User keeps owned books after cancel
7. Audio stops at 15h, upsell triggers

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
- [x] Structured logging (`lib/logger.ts`)
- [x] Environment validation (`lib/env.ts`)
- [x] Performance indexes (migrations 00005, 00006)
- [x] Correlation IDs in logs (middleware + logger)
- [ ] Error alerting (PagerDuty/Slack)
- [x] Generation cost tracking per user (`/api/admin/costs`)
- [ ] Analytics dashboard
- [ ] **Streaming audio with caching** - Stream TTS directly to client while simultaneously caching to storage. Reduces initial latency from ~3-5s to ~500ms. Uses ElevenLabs streaming API + `tee()` to split stream.

### Medium Priority
- [ ] OpenAI fallback for LLM calls
- [ ] A/B testing framework
- [x] Performance monitoring (Vercel Analytics)
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
ELEVENLABS_AGENT_ID           # Voice Mode agent ID (Conversational AI)
SENDGRID_API_KEY              # Transactional emails
VOYAGE_API_KEY                # Embeddings for semantic search
NEXT_PUBLIC_APP_URL           # Production URL (https://chronicle.town)
NEXT_PUBLIC_VOICE_MODE_ENABLED # Enable voice mode (staging only)
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

### 2026-01-13
- **Phase 14.11 started: Voice Mode (Audio Path)**
  - Voice-based story creation using ElevenLabs Conversational AI
  - New route `/create/audio` with voice interface
  - Backend endpoint `/api/voice/signed-url` for authenticated WebSocket connections
  - Installed `@elevenlabs/react` SDK for conversation management
  - Feature flag `NEXT_PUBLIC_VOICE_MODE_ENABLED` for staging-only deployment
  - Voice link added to `/create/new` page (visible on staging)
  - **Requires**: ElevenLabs agent creation in dashboard + `ELEVENLABS_AGENT_ID` env var

### 2026-01-09
- **Phase 14.10 complete: Chronicle Reader V1**
  - Full-screen immersive reader at `/reader/[bookId]`
  - Progress tracking (scroll percentage, time remaining)
  - Perfect resume (remembers and restores scroll position)
  - Typography controls (font size, line height, font family, theme)
  - Separate route group to avoid layout interference
  - Database tables: `reader_progress`, `typography_settings`
- **Phase 14.9 complete: Payment System**
  - Stripe integration with Checkout (hosted)
  - Two editions: Standard (draft) and Masterwork (polished + audio)
  - Four lengths: Short (30pg), Book (60pg), Long (120pg), Epic (300pg)
  - **Free tier**: Standard short stories are free
  - Webhook handling for payment completion
  - Preview page shows edition selector with prices
- **Cover regeneration fix**
  - Added cache-busting timestamp to cover URLs
  - Fixed BookCoverClient not updating after regeneration
- **Phase 14.8 complete: Testing Infrastructure**
  - Typed API client (`lib/api-client.ts`) - compile-time contract safety
  - GitHub Actions CI pipeline (runs on push to main/staging)
  - 61 unit/integration tests for API utilities and client
  - Playwright E2E smoke tests (landing, login, navigation)
- **Phase 14.7 confirmed complete: Story Slider System**
  - All 14 sliders implemented with UI, config, resolution, and LLM injection
- **Technical debt: Correlation IDs**
  - Added `generateCorrelationId()` and `getCorrelationId()` to logger
  - Middleware now adds `x-correlation-id` to all requests/responses
- **Technical debt: Cost tracking**
  - Added `lib/ai-pricing.ts` with model pricing and cost calculations
  - Added `/api/admin/costs` endpoint to query user AI costs
- **Technical debt: Performance monitoring**
  - Integrated Vercel Analytics (`@vercel/analytics`)
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
