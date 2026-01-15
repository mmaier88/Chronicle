import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Book, Chapter, Section } from '@/types/chronicle'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SectionEditor } from '@/components/books/SectionEditor'

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string; sectionId: string }>
}) {
  const { id, chapterId, sectionId } = await params
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

  const { data: section } = await supabase
    .from('sections')
    .select('*')
    .eq('id', sectionId)
    .eq('chapter_id', chapterId)
    .single()

  if (!section) {
    notFound()
  }

  const typedSection = section as Section

  return (
    <div>
      <Link
        href={`/create/books/${id}/chapters/${chapterId}`}
        className="app-nav-link"
        style={{ marginBottom: '1.5rem', display: 'inline-flex' }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Back to {typedChapter.title}
      </Link>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--moon-soft)', opacity: 0.7, marginBottom: '0.25rem' }}>
          <span>{typedBook.title}</span>
          <span>/</span>
          <span>Chapter {typedChapter.index + 1}</span>
          <span>/</span>
          <span>Section {typedSection.index + 1}</span>
        </div>
        <h1 className="app-heading-1">{typedSection.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
          <span className={typedSection.status === 'draft' ? 'app-badge app-badge-warning' : typedSection.status === 'locked' ? 'app-badge app-badge-info' : 'app-badge app-badge-success'}>
            {typedSection.status}
          </span>
          {typedSection.promoted_at && (
            <span className="app-body-sm" style={{ opacity: 0.7 }}>
              Promoted {new Date(typedSection.promoted_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <SectionEditor
        section={typedSection}
        book={typedBook}
        chapter={typedChapter}
      />
    </div>
  )
}
