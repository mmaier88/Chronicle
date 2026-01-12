import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Share2, Clock, Headphones, Sparkles } from 'lucide-react'
import { SharedBookAudioPlayer } from '@/components/audio/SharedBookAudioPlayer'
import { markdownToHtml } from '@/lib/utils'

interface SharedChapter {
  id: string
  index: number
  title: string
}

interface SharedSection {
  id: string
  chapter_id: string
  index: number
  title: string
  content_text: string | null
}

export default async function SharedBookPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const supabase = createServiceClient()

  // Get shared book using RLS bypass function
  const { data: books, error: bookError } = await supabase.rpc(
    'get_shared_book',
    { token }
  )

  if (bookError || !books || books.length === 0) {
    notFound()
  }

  const book = books[0]

  // Get chapters
  const { data: chapters } = await supabase.rpc('get_shared_chapters', { token })

  // Get sections
  const { data: sections } = await supabase.rpc('get_shared_sections', { token })

  // Group sections by chapter
  const chaptersWithSections = (chapters || []).map((ch: SharedChapter) => ({
    ...ch,
    sections: (sections || [])
      .filter((s: SharedSection) => s.chapter_id === ch.id)
      .sort((a: SharedSection, b: SharedSection) => a.index - b.index),
  }))

  // Calculate stats
  const totalWords = chaptersWithSections.reduce(
    (sum: number, ch: { sections: SharedSection[] }) =>
      sum +
      ch.sections.reduce(
        (sSum: number, s: SharedSection) =>
          sSum + (s.content_text?.split(/\s+/).length || 0),
        0
      ),
    0
  )

  // Build flat sections list for audio player
  const allSections = chaptersWithSections.flatMap(
    (chapter: { id: string; title: string; sections: SharedSection[] }, chIdx: number) =>
      chapter.sections
        .filter((s: SharedSection) => s.content_text)
        .map((section: SharedSection, sIdx: number) => ({
          id: section.id,
          title: section.title,
          chapterTitle: chapter.title,
          chapterIndex: chIdx,
          sectionIndex: sIdx,
        }))
  )

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Book Header */}
      <header
        style={{
          marginBottom: '3rem',
          paddingBottom: '2.5rem',
          borderBottom: '1px solid rgba(250, 246, 237, 0.08)',
        }}
      >
        {/* Cover Image */}
        {book.cover_url && (
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
            <img
              src={book.cover_url}
              alt={`Cover for ${book.title}`}
              style={{
                width: 200,
                height: 300,
                objectFit: 'cover',
                borderRadius: 8,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              }}
            />
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--moon-soft)',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          <Share2 style={{ width: 16, height: 16 }} />
          <span style={{ fontWeight: 500 }}>Shared with you</span>
        </div>
        <h1
          className="app-heading-1"
          style={{ marginBottom: '1rem', fontSize: 'clamp(2rem, 5vw, 3rem)' }}
        >
          {book.title}
        </h1>
        {book.core_question && (
          <p
            style={{
              fontSize: '1.25rem',
              color: 'var(--moon-soft)',
              lineHeight: 1.6,
              fontStyle: 'italic',
              opacity: 0.8,
            }}
          >
            {book.core_question}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            marginTop: '2rem',
            fontSize: '0.875rem',
            color: 'var(--moon-soft)',
            opacity: 0.7,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <BookOpen style={{ width: 16, height: 16 }} />
            {chaptersWithSections.length} chapters
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

        {/* Audio Player */}
        {allSections.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <SharedBookAudioPlayer
              bookTitle={book.title}
              sections={allSections}
              shareToken={token}
              bookId={book.id}
              coverUrl={book.cover_url}
            />
          </div>
        )}
      </header>

      {/* Table of Contents */}
      <nav style={{ marginBottom: '4rem' }}>
        <h2 className="app-label" style={{ marginBottom: '1rem' }}>
          Contents
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {chaptersWithSections.map(
            (chapter: { id: string; title: string }, idx: number) => (
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
                  transition: 'color 0.2s',
                }}
              >
                <span
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--amber-warm)',
                    fontWeight: 500,
                    width: 32,
                    opacity: 0.6,
                  }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem' }}>
                  {chapter.title}
                </span>
              </a>
            )
          )}
        </div>
      </nav>

      {/* Book Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
        {chaptersWithSections.map(
          (
            chapter: { id: string; title: string; sections: SharedSection[] },
            chIdx: number
          ) => (
            <article
              key={chapter.id}
              id={`chapter-${chIdx + 1}`}
              style={{ scrollMarginTop: 32 }}
            >
              {/* Chapter Header */}
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: '2.5rem',
                  padding: '1.5rem 0',
                }}
              >
                <span className="app-label">Chapter {chIdx + 1}</span>
                <h2 className="app-heading-2" style={{ marginTop: '0.5rem' }}>
                  {chapter.title}
                </h2>
              </div>

              {/* Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {chapter.sections.map((section: SharedSection) => (
                  <div key={section.id}>
                    {chapter.sections.length > 1 && (
                      <h3 className="app-heading-3" style={{ marginBottom: '1rem' }}>
                        {section.title}
                      </h3>
                    )}
                    {section.content_text ? (
                      <div
                        style={{
                          color: 'var(--moon-mid)',
                          lineHeight: 1.8,
                          fontSize: '1.125rem',
                          fontFamily: 'var(--font-serif)',
                        }}
                        dangerouslySetInnerHTML={{ __html: markdownToHtml(section.content_text) }}
                      />
                    ) : (
                      <div
                        style={{
                          color: 'var(--moon-mid)',
                          lineHeight: 1.8,
                          fontSize: '1.125rem',
                          fontFamily: 'var(--font-serif)',
                        }}
                      >
                        <span
                          style={{
                            color: 'var(--moon-soft)',
                            fontStyle: 'italic',
                            opacity: 0.5,
                          }}
                        >
                          This section is still being written...
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chapter divider */}
              {chIdx < chaptersWithSections.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'var(--amber-warm)',
                      opacity: 0.3,
                    }}
                  >
                    <span style={{ width: 32, height: 1, background: 'var(--amber-warm)' }} />
                    <span style={{ fontSize: '1.125rem' }}>✦</span>
                    <span style={{ width: 32, height: 1, background: 'var(--amber-warm)' }} />
                  </div>
                </div>
              )}
            </article>
          )
        )}
      </div>

      {/* End */}
      <footer
        style={{
          textAlign: 'center',
          padding: '5rem 0',
          marginTop: '4rem',
          borderTop: '1px solid rgba(250, 246, 237, 0.08)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.5rem',
            color: 'var(--amber-warm)',
            fontStyle: 'italic',
            marginBottom: '1.5rem',
            opacity: 0.6,
          }}
        >
          — The End —
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            color: 'var(--amber-warm)',
            marginBottom: '2rem',
          }}
        >
          <Sparkles style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Made with Chronicle</span>
        </div>
        <Link href="/create/new" className="app-button-primary">
          Create your own story
          <span style={{ color: 'var(--night-deep)' }}>→</span>
        </Link>
      </footer>
    </div>
  )
}
