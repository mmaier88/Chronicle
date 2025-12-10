# ResearchBase

> **AI-native, multiplayer research environment**

ResearchBase transforms how researchers and teams work with documents. It's a **project brain** that writes with you, understands your documents semantically, retrieves evidence from PDFs, explains conceptual changes, verifies citations, assesses safety/hallucination risk, and maintains your knowledge base automatically.

## Live Demo

**Production:** https://researchbase.abstractfinance.io

## Features

### Core Editor
- Rich text editing with TipTap
- Slash commands (`/summarize`, `/rewrite`, `/expand`, etc.)
- AI-powered text transformations via Claude
- Real-time multiplayer collaboration (Yjs)
- Keyboard shortcuts for power users

### Source Management
- PDF upload and processing
- Automatic text extraction and chunking
- Voyage AI embeddings (1024 dimensions)
- In-app PDF viewer with zoom and navigation

### Evidence & Citations
- Semantic search across all sources
- Evidence panel with similarity scoring
- Citation system with verification
- Multiple citation styles (APA, MLA, Chicago, Harvard, IEEE)
- BibTeX export

### AI-Powered Analysis
- **Ask-Project:** Query your knowledge base with Claude synthesis
- **Claim Extraction:** Identify claims, assumptions, evidence
- **Citation Verification:** AI-powered fact-checking
- **Safety Assessment:** Hallucination risk scoring
- **Semantic Diff:** Conceptual change detection

### Workflows & Automation
- Configurable automated workflows
- Citation verification runs
- Safety assessment scheduling
- Execution tracking and history

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React, TipTap, Tailwind CSS |
| Backend | Supabase (Postgres + pgvector, Auth, Storage) |
| AI/LLM | Anthropic Claude (claude-sonnet-4-20250514) |
| Embeddings | Voyage AI (voyage-2, 1024 dim) |
| Collaboration | Yjs + y-websocket |
| PDF Processing | react-pdf, pdf-parse |
| Deployment | Hetzner cx42, PM2, Caddy |
| Secrets | 1Password Service Accounts |

## Project Structure

```
ResearchBase/
├── app/                    # Next.js application
│   ├── src/
│   │   ├── app/           # App Router pages & API routes
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities (supabase, voyage, citations)
│   └── supabase/
│       └── migrations/    # Database schema
├── supabase/
│   └── functions/         # Edge Functions
├── infra/
│   └── 1password/         # Secrets management docs
├── scripts/               # Utility scripts
├── Roadmap.md            # Development roadmap
└── README.md             # This file
```

## Quick Start

### Prerequisites
- Node.js 20+
- npm
- Supabase project
- API keys: Anthropic, Voyage AI

### Local Development

```bash
# Clone repository
git clone https://github.com/mmaier88/ResearchBase.git
cd ResearchBase/app

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your keys

# Run development server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
VOYAGE_API_KEY=your_voyage_key
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/ask` | Query project knowledge base |
| `POST /api/ai/edit` | AI text transformations |
| `POST /api/evidence/find` | Semantic evidence search |
| `POST /api/sources/upload` | Upload PDF sources |
| `POST /api/sources/[id]/process` | Process uploaded PDF |
| `POST /api/citations/verify` | Verify citation accuracy |
| `POST /api/claims/extract` | Extract claims from document |
| `POST /api/safety/assess` | Assess document safety |
| `POST /api/diff/semantic` | Compare document versions |
| `GET/POST /api/workflows` | Manage workflows |
| `POST /api/workflows/execute` | Execute workflow action |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open Ask-Project |
| `Cmd/Ctrl + S` | Save document |
| `Cmd/Ctrl + Shift + E` | Find Evidence |
| `Cmd/Ctrl + Shift + C` | Citations panel |
| `Cmd/Ctrl + Shift + A` | Arguments panel |
| `Cmd/Ctrl + Shift + Y` | Safety panel |
| `?` | Keyboard shortcuts help |
| `Esc` | Close panels |

## Deployment

### Server Setup (Hetzner)

```bash
# Deploy to server
rsync -avz --exclude 'node_modules' --exclude '.next' \
  ./app/ root@138.199.231.3:/opt/researchbase/app/

# On server
cd /opt/researchbase/app
npm install
npm run build
pm2 restart researchbase
```

## Documentation

- **[Roadmap.md](./Roadmap.md)** - Detailed development roadmap with phase progress
- **[infra/1password/](./infra/1password/)** - Secrets management documentation

## License

Proprietary - Abstract Finance

## Contributing

Internal development only. Contact the team for access.
