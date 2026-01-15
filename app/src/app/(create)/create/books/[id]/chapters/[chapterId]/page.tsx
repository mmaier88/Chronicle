import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Book, Chapter, Section } from '@/types/chronicle'
import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle } from 'lucide-react'
import { CreateSectionButton } from '@/components/books/CreateSectionButton'

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>
}) {
  const { id, chapterId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!book) {
    notFound()
  }

  const typedBook = book as Book

  const { data: chapter } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', chapterId)
    .eq('book_id', id)
    .single()

  if (!chapter) {
    notFound()
  }

  const typedChapter = chapter as Chapter

  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('index', { ascending: true })

  const typedSections = (sections || []) as Section[]

  return (
    <div>
      <Link
        href={`/create/books/${id}`}
        className="app-nav-link"
        style={{ marginBottom: '1.5rem', display: 'inline-flex' }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Back to {typedBook.title}
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--moon-soft)', opacity: 0.7 }}>Chapter {typedChapter.index + 1}</span>
        <h1 className="app-heading-1">{typedChapter.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
          <span className={typedChapter.status === 'draft' ? 'app-badge app-badge-warning' : typedChapter.status === 'locked' ? 'app-badge app-badge-info' : 'app-badge app-badge-success'}>
            {typedChapter.status}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr' }}>
        <div className="lg:col-span-2">
          <div className="app-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="app-heading-3">Sections</h2>
              <CreateSectionButton chapterId={chapterId} bookId={id} nextIndex={typedSections.length} />
            </div>

            {typedSections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed rgba(250, 246, 237, 0.2)', borderRadius: 12 }}>
                <FileText style={{ width: 32, height: 32, color: 'var(--amber-warm)', margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <p className="app-body" style={{ marginBottom: '0.5rem' }}>No sections yet</p>
                <p className="app-body-sm" style={{ marginBottom: '1rem' }}>Add sections to structure this chapter</p>
                <CreateSectionButton chapterId={chapterId} bookId={id} nextIndex={0} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {typedSections.map((section, idx) => (
                  <Link
                    key={section.id}
                    href={`/create/books/${id}/chapters/${chapterId}/sections/${section.id}`}
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
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--moon-soft)', opacity: 0.6 }}>Section {idx + 1}</span>
                        <h3 className="app-heading-3" style={{ fontSize: '1rem' }}>{section.title}</h3>
                        {section.goal && (
                          <p className="app-body-sm" style={{ marginTop: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{section.goal}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {section.status === 'canonical' && (
                          <CheckCircle style={{ width: 16, height: 16, color: '#6ee7b7' }} />
                        )}
                        <span className={section.status === 'draft' ? 'app-badge app-badge-warning' : section.status === 'locked' ? 'app-badge app-badge-info' : 'app-badge app-badge-success'}>
                          {section.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="app-card">
            <h3 className="app-heading-3" style={{ marginBottom: '1rem' }}>Chapter Details</h3>

            {typedChapter.purpose && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="app-label">Purpose</label>
                <p className="app-body-sm" style={{ marginTop: '0.25rem' }}>{typedChapter.purpose}</p>
              </div>
            )}

            {typedChapter.central_claim && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="app-label">Central Claim</label>
                <p className="app-body-sm" style={{ marginTop: '0.25rem' }}>{typedChapter.central_claim}</p>
              </div>
            )}

            {typedChapter.emotional_arc && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="app-label">Emotional Arc</label>
                <p className="app-body-sm" style={{ marginTop: '0.25rem' }}>{typedChapter.emotional_arc}</p>
              </div>
            )}

            {typedChapter.failure_mode && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="app-label">Failure Mode</label>
                <p className="app-body-sm" style={{ marginTop: '0.25rem' }}>{typedChapter.failure_mode}</p>
              </div>
            )}

            {typedChapter.motifs && typedChapter.motifs.length > 0 && (
              <div>
                <label className="app-label">Motifs</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {typedChapter.motifs.map((motif, idx) => (
                    <span key={idx} style={{ fontSize: '0.75rem', background: 'rgba(212, 165, 116, 0.15)', color: 'var(--amber-warm)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                      {motif}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!typedChapter.purpose && !typedChapter.central_claim && !typedChapter.emotional_arc && (
              <p className="app-body-sm">No additional details set for this chapter.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
