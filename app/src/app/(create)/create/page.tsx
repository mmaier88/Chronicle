import { createClient, getUser } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { AudioStoryCard } from '@/components/audio/AudioStoryCard'
import { SharedStoryCard } from '@/components/audio/SharedStoryCard'
import { CoverStatus } from '@/types/chronicle'

export default async function CreateLandingPage() {
  const supabase = await createClient()
  const { user } = await getUser()

  // Create service client directly for staff picks (bypasses RLS)
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch user's recent completed books (hide skeletons/in-progress)
  const { data: recentBooks } = await supabase
    .from('books')
    .select('id, title, status, created_at, cover_url, cover_status, core_question')
    .eq('owner_id', user?.id)
    .eq('source', 'vibe')
    .eq('status', 'final')
    .order('created_at', { ascending: false })
    .limit(3)

  // Fetch staff picks using direct query (bypassing RPC due to schema cache issues)
  const { data: staffPicksRaw, error: staffPicksError } = await serviceClient
    .from('books')
    .select(`
      id,
      title,
      cover_url,
      core_question,
      created_at,
      book_shares!inner(share_token)
    `)
    .eq('is_staff_pick', true)
    .eq('status', 'final')
    .not('cover_url', 'is', null)
    .order('staff_pick_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(6)

  // Debug logging
  if (staffPicksError) {
    console.error('[Create Page] Staff picks error:', staffPicksError)
  }

  // Transform to expected format for SharedStoryCard
  const staffPicks = (staffPicksRaw || []).map((p: {
    id: string
    title: string
    cover_url: string | null
    core_question: string | null
    created_at: string
    book_shares: { share_token: string }[]
  }) => ({
    id: p.id,
    title: p.title,
    cover_url: p.cover_url,
    core_question: p.core_question,
    created_at: p.created_at,
    share_token: p.book_shares[0]?.share_token
  }))

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Hero Section */}
      <section style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <p className="app-label" style={{ marginBottom: '1.5rem' }}>
          Stories made for you
        </p>

        <h1 className="app-heading-1" style={{ marginBottom: '1.5rem' }}>
          What story are you<br />in the mood for?
        </h1>

        <p className="app-body" style={{ maxWidth: 540, marginBottom: '2.5rem', opacity: 0.8 }}>
          Share a feeling, a tone, or a spark of an idea — and Chronicle will craft an original book just for you.
        </p>

        <Link href="/create/new" className="app-button-primary">
          <Sparkles style={{ width: 18, height: 18 }} />
          Start a new story
        </Link>
      </section>

      {/* Recent books - with Listen button like Stories page */}
      {recentBooks && recentBooks.length > 0 && (
        <section>
          <h2 className="app-label" style={{ marginBottom: '1rem' }}>Your stories</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentBooks.map((book) => (
              <AudioStoryCard
                key={book.id}
                story={{
                  id: book.id,
                  title: book.title,
                  status: book.status,
                  created_at: book.created_at,
                  core_question: book.core_question,
                  cover_url: book.cover_url,
                  cover_status: book.cover_status as CoverStatus,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Staff Picks */}
      {staffPicks && staffPicks.length > 0 && (
        <section style={{ marginTop: '3rem' }}>
          <h2 className="app-label" style={{ marginBottom: '1rem' }}>Staff Picks</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {staffPicks.map((pick) => (
              <SharedStoryCard
                key={pick.id}
                story={pick}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
