# ResearchBase App

Next.js application for the ResearchBase AI research environment.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (dashboard)/           # Authenticated routes
│   │   ├── dashboard/         # Main dashboard
│   │   ├── documents/[id]/    # Document editor
│   │   ├── sources/           # Source management
│   │   └── automations/       # Workflow configuration
│   ├── api/                   # API routes
│   │   ├── ai/edit/           # AI text editing
│   │   ├── ask/               # Ask-Project queries
│   │   ├── citations/verify/  # Citation verification
│   │   ├── claims/extract/    # Claim extraction
│   │   ├── diff/semantic/     # Semantic diff
│   │   ├── evidence/find/     # Evidence search
│   │   ├── safety/assess/     # Safety assessment
│   │   ├── sources/           # Source management
│   │   └── workflows/         # Workflow management
│   ├── login/                 # Authentication
│   ├── signup/
│   └── callback/
├── components/
│   ├── citations/             # Citation components
│   ├── collaboration/         # Yjs multiplayer
│   ├── editor/                # TipTap editor
│   ├── evidence/              # Evidence panel
│   ├── help/                  # Help dialogs
│   ├── pdf/                   # PDF viewer
│   └── workflows/             # Workflow UI
├── hooks/
│   ├── useCollaboration.ts    # Yjs hook
│   └── useKeyboardShortcuts.ts
└── lib/
    ├── anthropic.ts           # Claude client
    ├── citations.ts           # Citation formatting
    ├── supabase/              # Supabase clients
    └── voyage.ts              # Voyage AI client
```

## Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...
```

## Key Components

### Editor (`components/editor/`)
- TipTap-based rich text editor
- Custom extensions: Citation, AISpan, SlashCommand
- Toolbar with formatting and AI actions

### Panels
- **AskProject** - Query knowledge base
- **CitationPanel** - Manage and verify citations
- **ArgumentPanel** - View extracted claims
- **SafetyPanel** - Safety assessment results
- **EvidencePanel** - Search for supporting evidence

### PDF Viewer (`components/pdf/`)
- In-app PDF viewing with react-pdf
- Zoom, navigation, text selection
- Modal and inline modes

### Collaboration (`components/collaboration/`)
- CollaborativeEditor with Yjs
- CollaboratorPresence avatars
- Real-time cursor tracking

## Database

Migrations in `supabase/migrations/`:
- `00001_initial_schema.sql` - Full schema with pgvector

Key tables:
- `documents` - User documents
- `sources` - Uploaded PDFs
- `source_chunks` - Embedded text chunks
- `citations` - Document citations
- `claims` - Extracted claims
- `workflows` - Automation configurations

## Deployment

```bash
# Build
npm run build

# Deploy via rsync
rsync -avz --exclude 'node_modules' --exclude '.next' \
  ./ root@138.199.231.3:/opt/researchbase/app/

# On server
npm install
npm run build
pm2 restart researchbase
```

## See Also

- [../Roadmap.md](../Roadmap.md) - Full development roadmap
- [../README.md](../README.md) - Project overview
