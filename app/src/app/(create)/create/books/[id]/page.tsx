import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Book, Chapter } from '@/types/chronicle'
import Link from 'next/link'
import { ArrowLeft, Lock, BookOpen } from 'lucide-react'
import { ConstitutionEditor } from '@/components/books/ConstitutionEditor'
import { CreateChapterButton } from '@/components/books/CreateChapterButton'

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (error || !book) {
    notFound()
  }

  const typedBook = book as Book

  const { data: chapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', id)
    .order('index', { ascending: true })

  const typedChapters = (chapters || []) as Chapter[]

  return (
    <div>
      <Link
        href="/create/books"
        className="app-nav-link"
        style={{ marginBottom: '1.5rem', display: 'inline-flex' }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Back to Books
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 className="app-heading-1">{typedBook.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <span className={typedBook.status === 'drafting' ? 'app-badge app-badge-warning' : typedBook.status === 'editing' ? 'app-badge app-badge-info' : 'app-badge app-badge-success'}>
              {typedBook.status}
            </span>
            <span className="app-body-sm" style={{ opacity: 0.7 }}>
              {typedBook.genre === 'non_fiction' ? 'Non-Fiction' : 'Literary Fiction'}
            </span>
          </div>
          {typedBook.core_question && (
            <p className="app-body" style={{ marginTop: '0.75rem', maxWidth: 640, opacity: 0.8 }}>{typedBook.core_question}</p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr', '@media (min-width: 1024px)': { gridTemplateColumns: '2fr 1fr' } } as React.CSSProperties}>
        <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="app-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="app-heading-3">Chapters</h2>
              {typedBook.constitution_locked && <CreateChapterButton bookId={typedBook.id} nextIndex={typedChapters.length} />}
            </div>

            {!typedBook.constitution_locked ? (
              <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed rgba(250, 246, 237, 0.2)', borderRadius: 12 }}>
                <Lock style={{ width: 32, height: 32, color: 'var(--amber-warm)', margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <p className="app-body" style={{ marginBottom: '0.5rem' }}>Lock the Constitution to add chapters</p>
                <p className="app-body-sm">The Constitution must be finalized before writing begins</p>
              </div>
            ) : typedChapters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed rgba(250, 246, 237, 0.2)', borderRadius: 12 }}>
                <BookOpen style={{ width: 32, height: 32, color: 'var(--amber-warm)', margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <p className="app-body" style={{ marginBottom: '0.5rem' }}>No chapters yet</p>
                <p className="app-body-sm" style={{ marginBottom: '1rem' }}>Start structuring your book by adding chapters</p>
                <CreateChapterButton bookId={typedBook.id} nextIndex={0} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {typedChapters.map((chapter, idx) => (
                  <Link
                    key={chapter.id}
                    href={`/create/books/${typedBook.id}/chapters/${chapter.id}`}
                    style={{
                      display: 'block',
                      padding: '1rem',
                      border: '1px solid rgba(250, 246, 237, 0.08)',
                      borderRadius: 12,
                      background: 'rgba(26, 39, 68, 0.3)',
                      textDecoration: 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--moon-soft)', opacity: 0.6 }}>Chapter {idx + 1}</span>
                        <h3 className="app-heading-3" style={{ fontSize: '1rem' }}>{chapter.title}</h3>
                        {chapter.purpose && (
                          <p className="app-body-sm" style={{ marginTop: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{chapter.purpose}</p>
                        )}
                      </div>
                      <span className={chapter.status === 'draft' ? 'app-badge app-badge-warning' : chapter.status === 'locked' ? 'app-badge app-badge-info' : 'app-badge app-badge-success'}>
                        {chapter.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ConstitutionEditor book={typedBook} />
        </div>
      </div>
    </div>
  )
}
