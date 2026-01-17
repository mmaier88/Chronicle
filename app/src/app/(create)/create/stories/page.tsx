import { createClient, getUser } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Sparkles } from 'lucide-react'
import { StoryCard } from '@/components/StoryCard'
import { CoverStatus } from '@/types/chronicle'
import { AutoResumeRedirect } from '@/components/AutoResumeRedirect'

export default async function StoriesPage() {
  const supabase = await createClient()
  const { user } = await getUser()

  // Check for any in-progress job (will auto-redirect)
  const { data: inProgressJob } = await supabase
    .from('vibe_jobs')
    .select('id, book_id, source_book_id, books!vibe_jobs_book_id_fkey(title)')
    .eq('user_id', user?.id)
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Get the book title for the in-progress job
  let inProgressBookTitle: string | null = null
  let isRemix = false
  if (inProgressJob) {
    // books can be an object (single row) or null
    const books = inProgressJob.books as { title: string } | { title: string }[] | null
    if (books && !Array.isArray(books)) {
      inProgressBookTitle = books.title
    } else if (Array.isArray(books) && books.length > 0) {
      inProgressBookTitle = books[0].title
    }
    isRemix = !!inProgressJob.source_book_id
  }

  // Fetch completed stories
  const { data: completedStories, error } = await supabase
    .from('books')
    .select('id, title, status, created_at, core_question, cover_url, cover_status, source_book_id')
    .eq('owner_id', user?.id)
    .eq('source', 'vibe')
    .eq('status', 'final')
    .order('created_at', { ascending: false })

  // Debug logging
  console.log('[StoriesPage] User:', user?.id, user?.email)
  console.log('[StoriesPage] Query result:', { count: completedStories?.length, error: error?.message })

  // Fetch source book titles for regenerated books
  const sourceBookIds = (completedStories || [])
    .map(s => s.source_book_id)
    .filter((id): id is string => id !== null)

  let sourceBookTitles: Record<string, string> = {}
  if (sourceBookIds.length > 0) {
    const { data: sourceBooks } = await supabase
      .from('books')
      .select('id, title')
      .in('id', sourceBookIds)

    sourceBookTitles = (sourceBooks || []).reduce((acc, book) => {
      acc[book.id] = book.title
      return acc
    }, {} as Record<string, string>)
  }

  if (error) {
    console.error('Error fetching stories:', error)
  }

  const stories = completedStories || []

  // TEMP DEBUG - remove after fixing
  const debugInfo = {
    userId: user?.id,
    userEmail: user?.email,
    queryCount: completedStories?.length ?? 0,
    queryError: error?.message ?? null,
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* TEMP DEBUG */}
      <pre style={{ fontSize: 10, opacity: 0.5, marginBottom: 16 }}>
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      {/* Auto-redirect to generating page if there's an in-progress job */}
      <AutoResumeRedirect
        jobId={inProgressJob?.id || null}
        bookTitle={inProgressBookTitle}
        isRemix={isRemix}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="app-heading-1">Your Stories</h1>
          <p className="app-body" style={{ marginTop: '0.25rem', opacity: 0.7 }}>
            All the stories Chronicle has created for you
          </p>
        </div>
        <Link href="/create/new" className="app-button-primary">
          <Sparkles style={{ width: 16, height: 16 }} />
          New Story
        </Link>
      </div>

      {stories.length === 0 ? (
        <div className="app-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <BookOpen style={{ width: 48, height: 48, color: 'var(--amber-warm)', margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 className="app-heading-3" style={{ marginBottom: '0.5rem' }}>No stories yet</h3>
          <p className="app-body-sm" style={{ marginBottom: '1.5rem' }}>
            Create your first story and it will appear here
          </p>
          <Link href="/create/new" className="app-button-primary">
            <Sparkles style={{ width: 16, height: 16 }} />
            Create a Story
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={{
                id: story.id,
                title: story.title,
                status: story.status,
                created_at: story.created_at,
                core_question: story.core_question,
                cover_url: story.cover_url,
                cover_status: story.cover_status as CoverStatus,
                source_book_title: story.source_book_id ? sourceBookTitles[story.source_book_id] : null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
