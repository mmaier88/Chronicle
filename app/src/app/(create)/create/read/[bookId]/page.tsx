import { createClient, getUser, createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Sparkles, Clock, Headphones } from 'lucide-react'
import { BookAudioPlayer } from '@/components/audio/BookAudioPlayer'
import { BookCoverClient } from '@/components/cover/BookCoverClient'
import { RegenerateCoverButton } from '@/components/cover/RegenerateCoverButton'
import { UploadCoverButton } from '@/components/cover/UploadCoverButton'
import { ShareButton } from '@/components/share/ShareButton'
import { ExportButton } from '@/components/export/ExportButton'
import { SendToKindleButton } from '@/components/export/SendToKindleButton'
import { markdownToHtml } from '@/lib/utils'

interface Chapter {
  id: string
  index: number
  title: string
  sections: Section[]
}

interface Section {
  id: string
  index: number
  title: string
  content_text: string | null
}

export default async function VibeReadPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params
  const { user, isDevUser } = await getUser()

  if (!user) {
    notFound()
  }

  const supabase = isDevUser ? createServiceClient() : await createClient()

  // Fetch book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    notFound()
  }

  // Fetch existing share link
  const { data: existingShare } = await supabase
    .from('book_shares')
    .select('share_token')
    .eq('book_id', bookId)
    .eq('enabled', true)
    .single()

  const shareUrl = existingShare?.share_token
    ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/share/${existingShare.share_token}`
    : null

  // Fetch chapters with sections
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, index, title, sections(id, index, title, content_text)')
    .eq('book_id', bookId)
    .order('index')

  const sortedChapters = (chapters || []).map(ch => ({
    ...ch,
    sections: (ch.sections || []).sort((a: Section, b: Section) => a.index - b.index)
  })) as Chapter[]

  // Calculate stats
  const totalWords = sortedChapters.reduce((sum, ch) =>
    sum + ch.sections.reduce((sSum, s) =>
      sSum + (s.content_text?.split(/\s+/).length || 0), 0
    ), 0
  )

  // Build flat sections list for audio player
  const allSections = sortedChapters.flatMap((chapter, chIdx) =>
    chapter.sections
      .filter(s => s.content_text) // Only sections with content
      .map((section, sIdx) => ({
        id: section.id,
        title: section.title,
        chapterTitle: chapter.title,
        chapterIndex: chIdx,
        sectionIndex: sIdx,
      }))
  )

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Back button */}
      <Link
        href="/create"
        className="app-nav-link"
        style={{ marginBottom: '2.5rem', display: 'inline-flex' }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        <span>Your stories</span>
      </Link>

      {/* Book Header */}
      <header style={{ marginBottom: '3rem', paddingBottom: '2.5rem', borderBottom: '1px solid rgba(250, 246, 237, 0.08)' }}>
        {/* Cover Image */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <BookCoverClient
            bookId={book.id}
            initialCoverUrl={book.cover_url}
            initialStatus={book.cover_status}
            title={book.title}
            size="lg"
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <RegenerateCoverButton bookId={book.id} />
            <UploadCoverButton bookId={book.id} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--amber-warm)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          <Sparkles style={{ width: 16, height: 16 }} />
          <span style={{ fontWeight: 500 }}>Written just for you</span>
        </div>
        <h1 className="app-heading-1" style={{ marginBottom: '1rem', fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
          {book.title}
        </h1>
        {book.core_question && (
          <p style={{
            fontSize: '1.25rem',
            color: 'var(--moon-soft)',
            lineHeight: 1.6,
            fontStyle: 'italic',
            opacity: 0.8
          }}>
            {book.core_question}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--moon-soft)', opacity: 0.7 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <BookOpen style={{ width: 16, height: 16 }} />
            {sortedChapters.length} chapters
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Clock style={{ width: 16, height: 16 }} />
            ~{Math.ceil(totalWords / 250)} min read
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Headphones style={{ width: 16, height: 16 }} />
            ~{Math.ceil(totalWords / 150)} min listen
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <ShareButton bookId={book.id} existingShareUrl={shareUrl} />
          <ExportButton book={book} chapters={sortedChapters} />
          <SendToKindleButton book={book} chapters={sortedChapters} />
        </div>

        {/* Audio Player */}
        {allSections.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <BookAudioPlayer bookTitle={book.title} sections={allSections} />
          </div>
        )}
      </header>

      {/* Table of Contents */}
      <nav style={{ marginBottom: '4rem' }}>
        <h2 className="app-label" style={{ marginBottom: '1rem' }}>
          Contents
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {sortedChapters.map((chapter, idx) => (
            <a
              key={chapter.id}
              href={`#chapter-${idx + 1}`}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '1rem',
                padding: '0.5rem 0',
                color: 'var(--moon-soft)',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
            >
              <span style={{ fontSize: '0.875rem', color: 'var(--amber-warm)', fontWeight: 500, width: 32, opacity: 0.6 }}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem' }}>
                {chapter.title}
              </span>
            </a>
          ))}
        </div>
      </nav>

      {/* Book Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
        {sortedChapters.map((chapter, chIdx) => (
          <article key={chapter.id} id={`chapter-${chIdx + 1}`} style={{ scrollMarginTop: 32 }}>
            {/* Chapter Header */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem', padding: '1.5rem 0' }}>
              <span className="app-label">
                Chapter {chIdx + 1}
              </span>
              <h2 className="app-heading-2" style={{ marginTop: '0.5rem' }}>
                {chapter.title}
              </h2>
            </div>

            {/* Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {chapter.sections.map((section) => (
                <div key={section.id}>
                  {chapter.sections.length > 1 && (
                    <h3 className="app-heading-3" style={{ marginBottom: '1rem' }}>{section.title}</h3>
                  )}
                  {section.content_text ? (
                    <div
                      style={{
                        color: 'var(--moon-mid)',
                        lineHeight: 1.8,
                        fontSize: '1.125rem',
                        fontFamily: 'var(--font-serif)'
                      }}
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(section.content_text) }}
                    />
                  ) : (
                    <div style={{
                      color: 'var(--moon-mid)',
                      lineHeight: 1.8,
                      fontSize: '1.125rem',
                      fontFamily: 'var(--font-serif)'
                    }}>
                      <span style={{ color: 'var(--moon-soft)', fontStyle: 'italic', opacity: 0.5 }}>
                        This section is still being written...
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Chapter divider */}
            {chIdx < sortedChapters.length - 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--amber-warm)', opacity: 0.3 }}>
                  <span style={{ width: 32, height: 1, background: 'var(--amber-warm)' }} />
                  <span style={{ fontSize: '1.125rem' }}>✦</span>
                  <span style={{ width: 32, height: 1, background: 'var(--amber-warm)' }} />
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* End */}
      <footer style={{ textAlign: 'center', padding: '5rem 0', marginTop: '4rem', borderTop: '1px solid rgba(250, 246, 237, 0.08)' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--amber-warm)', fontStyle: 'italic', marginBottom: '1.5rem', opacity: 0.6 }}>
          — The End —
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--amber-warm)', marginBottom: '2rem' }}>
          <Sparkles style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Made with Chronicle</span>
        </div>
        <Link
          href="/create/new"
          className="app-button-primary"
        >
          Create another story
          <span style={{ color: 'var(--night-deep)' }}>→</span>
        </Link>
      </footer>
    </div>
  )
}
