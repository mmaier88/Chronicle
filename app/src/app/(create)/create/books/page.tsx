import { createClient } from '@/lib/supabase/server'
import { Book } from '@/types/chronicle'
import Link from 'next/link'
import { Clock, FileText, Wand2 } from 'lucide-react'
import { InProgressCard } from '../stories/InProgressCard'
import { isJobStuck } from '@/lib/job-recovery'

export default async function BooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all completed books that can be remixed
  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .eq('owner_id', user?.id)
    .eq('status', 'final')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching books:', error)
  }

  // Fetch in-progress regeneration jobs (books being generated from a source)
  const { data: inProgressBooks } = await supabase
    .from('books')
    .select(`
      id, title, status, source_book_id,
      vibe_jobs!inner(id, status, step, progress, error, updated_at, auto_resume_attempts)
    `)
    .eq('owner_id', user?.id)
    .eq('source', 'vibe')
    .neq('status', 'final')
    .not('source_book_id', 'is', null)
    .order('created_at', { ascending: false })

  // Process in-progress stories
  type BookWithJob = NonNullable<typeof inProgressBooks>[number]
  const inProgressStories = (inProgressBooks || []).map((book: BookWithJob) => {
    const job = Array.isArray(book.vibe_jobs) ? book.vibe_jobs[0] : book.vibe_jobs
    const jobStatus = {
      id: job.id,
      status: job.status,
      step: job.step,
      progress: job.progress,
      updated_at: job.updated_at,
      auto_resume_attempts: job.auto_resume_attempts,
      error: job.error,
    }
    return {
      id: book.id,
      title: book.title,
      status: book.status,
      job,
      isStale: isJobStuck(jobStatus)
    }
  })

  const typedBooks = (books || []) as Book[]

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="app-heading-1">Remix</h1>
        <p className="app-body" style={{ marginTop: '0.25rem', opacity: 0.7 }}>
          Create new versions of your stories
        </p>
      </div>

      {/* In Progress Remixes */}
      {inProgressStories.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 className="app-label" style={{ marginBottom: '1rem' }}>
            In Progress ({inProgressStories.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {inProgressStories.map((story) => (
              <InProgressCard
                key={story.id}
                story={{
                  id: story.id,
                  title: story.title,
                  status: story.status,
                  job: story.job,
                  isStale: story.isStale
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Available to Remix */}
      {typedBooks.length === 0 && inProgressStories.length === 0 ? (
        <div className="app-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Wand2 style={{ width: 48, height: 48, color: 'var(--amber-warm)', margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 className="app-heading-3" style={{ marginBottom: '0.5rem' }}>No stories to remix yet</h3>
          <p className="app-body-sm">
            Create a story first, then come back here to remix it
          </p>
        </div>
      ) : typedBooks.length > 0 && (
        <section>
          <h2 className="app-label" style={{ marginBottom: '1rem' }}>
            Available to Remix ({typedBooks.length})
          </h2>
          <div className="app-grid-3">
            {typedBooks.map((book) => (
              <Link
                key={book.id}
                href={`/create/regenerate/${book.id}`}
                className="app-card"
                style={{ display: 'block', textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h2 className="app-heading-3" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</h2>
                  <span className="app-badge app-badge-success">
                    {book.status}
                  </span>
                </div>

                {book.core_question && (
                  <p className="app-body-sm" style={{ marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{book.core_question}</p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--moon-soft)', opacity: 0.6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FileText style={{ width: 12, height: 12 }} />
                    {book.genre === 'non_fiction' ? 'Non-Fiction' : 'Literary Fiction'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock style={{ width: 12, height: 12 }} />
                    {new Date(book.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
