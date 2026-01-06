import { createClient } from '@/lib/supabase/server'
import { Book } from '@/types/chronicle'
import Link from 'next/link'
import { BookOpen, Clock, FileText, Wand2 } from 'lucide-react'

export default async function BooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .eq('owner_id', user?.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching books:', error)
  }

  const typedBooks = (books || []) as Book[]

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="app-heading-1">Remix</h1>
        <p className="app-body" style={{ marginTop: '0.25rem', opacity: 0.7 }}>
          Edit and republish your stories
        </p>
      </div>

      {typedBooks.length === 0 ? (
        <div className="app-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Wand2 style={{ width: 48, height: 48, color: 'var(--amber-warm)', margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 className="app-heading-3" style={{ marginBottom: '0.5rem' }}>No stories to remix yet</h3>
          <p className="app-body-sm">
            Create a story first, then come back here to edit and republish it
          </p>
        </div>
      ) : (
        <div className="app-grid-3">
          {typedBooks.map((book) => (
            <Link
              key={book.id}
              href={`/create/books/${book.id}`}
              className="app-card"
              style={{ display: 'block', textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h2 className="app-heading-3" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</h2>
                <span className={book.status === 'drafting' ? 'app-badge app-badge-warning' : book.status === 'editing' ? 'app-badge app-badge-info' : 'app-badge app-badge-success'}>
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

              {book.constitution_locked && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 8, height: 8, background: '#34d399', borderRadius: '50%' }}></span>
                  Constitution locked
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
