# Chronicle

**AI-native book creation platform** - Create, read, and share personalized stories generated just for you.

## Live Demo

- **Production**: [chronicle.town](https://chronicle.town)
- **Auth Domain**: auth.chronicle.town

## Features

- **AI Story Generation** - Describe your story idea, get a full book
- **Multiple Lengths** - 30, 60, 120, or 300 pages
- **Two Generation Modes**:
  - Normal (draft) - Fast, ~1 min/section
  - Masterpiece Mode - Full editorial pipeline, ~2-3 min/section
- **AI Cover Generation** - Automatic book covers via Google Gemini
- **Text-to-Speech** - Listen to your books with ElevenLabs voices
- **Shareable Links** - Public read + listen without signup
- **Export** - Download as PDF or EPUB

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React, TailwindCSS |
| Backend | Next.js API Routes, Supabase |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth + Google OAuth |
| AI | Anthropic Claude (text), Google Gemini (images) |
| Audio | ElevenLabs TTS |
| Email | SendGrid |
| Hosting | Vercel |

## Project Structure

```
Chronicle/
├── app/                    # Next.js application
│   ├── src/
│   │   ├── app/           # Pages and API routes
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities and services
│   │   └── types/         # TypeScript types
│   └── package.json
├── supabase/
│   └── migrations/        # Database migrations
└── ROADMAP.md             # Features and roadmap
```

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project
- API keys for: Anthropic, Google AI, ElevenLabs, SendGrid

### Environment Variables

Create `.env.local` in the `app/` directory:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ANTHROPIC_API_KEY=your_anthropic_key

# Optional (features disabled if missing)
GOOGLE_API_KEY=your_google_key          # Cover generation
ELEVENLABS_API_KEY=your_elevenlabs_key  # Text-to-speech
SENDGRID_API_KEY=your_sendgrid_key      # Transactional emails
VOYAGE_API_KEY=your_voyage_key          # Embeddings

# Production
NEXT_PUBLIC_APP_URL=https://chronicle.town
```

### Installation

```bash
cd app
npm install
npm run dev
```

### Database Setup

```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## API Routes

### Create Flow

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/create/preview` | POST | Generate book preview |
| `/api/create/job` | POST | Start generation job |
| `/api/create/job/[id]/tick` | POST | Advance job one step |
| `/api/create/job/[id]/status` | GET | Get job progress |
| `/api/create/surprise` | POST | Generate random prompt |

### Reading & Sharing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/share/create` | POST | Create share link |
| `/api/share/[token]` | GET | Get shared book data |
| `/api/tts/section/[id]` | GET | Get/generate audio |
| `/api/cover/generate` | POST | Generate book cover |

## Architecture

### Generation Pipeline

1. **Preview** - AI generates title, logline, blurb, cast, setting
2. **Constitution** - AI derives book's internal rules and voice
3. **Planning** - AI creates chapter/section structure
4. **Writing** - AI generates prose section by section
5. **Polish** (Masterpiece only) - 7-pass editorial refinement
6. **Cover** - AI generates cover image (runs in parallel)

### Database Schema

Key tables:
- `books` - Book metadata and status
- `chapters` - Chapter structure
- `sections` - Section content
- `vibe_jobs` - Generation job tracking
- `book_shares` - Share tokens
- `section_audio` - TTS audio cache

## Development

```bash
# Run development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build
```

## Deployment

Deployed via Vercel with automatic deployments from `main` branch.

## License

Proprietary - All rights reserved.

## Links

- [Roadmap](./ROADMAP.md)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com)
# Webhook configured Fri Jan  9 15:07:00 CET 2026
