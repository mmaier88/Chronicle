import { createClient, getUser } from '@/lib/supabase/server'
import { Book } from '@/types/chronicle'
import Link from 'next/link'
import { Clock, FileText, Wand2 } from 'lucide-react'
import { AutoResumeRedirect } from '@/components/AutoResumeRedirect'

export default async function BooksPage() {
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

  const typedBooks = (books || []) as Book[]

  return (
    <div>
      {/* Auto-redirect to generating page if there's an in-progress job */}
      <AutoResumeRedirect
        jobId={inProgressJob?.id || null}
        bookTitle={inProgressBookTitle}
        isRemix={isRemix}
      />

      <div style={{ marginBottom: '2rem' }}>
        <h1 className="app-heading-1">Remix</h1>
        <p className="app-body" style={{ marginTop: '0.25rem', opacity: 0.7 }}>
          Create new versions of your stories
        </p>
      </div>

      {typedBooks.length === 0 ? (
        <div className="app-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Wand2 style={{ width: 48, height: 48, color: 'var(--amber-warm)', margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 className="app-heading-3" style={{ marginBottom: '0.5rem' }}>No stories to remix yet</h3>
          <p className="app-body-sm">
            Create a story first, then come back here to remix it
          </p>
        </div>
      ) : (
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
      )}
    </div>
  )
}
