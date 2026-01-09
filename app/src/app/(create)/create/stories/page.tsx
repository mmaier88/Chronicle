import { createClient, getUser } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Clock, Sparkles } from 'lucide-react'
import { BookCover } from '@/components/cover/BookCover'
import { CoverStatus } from '@/types/chronicle'

export default async function StoriesPage() {
  const supabase = await createClient()
  const { user } = await getUser()

  // Fetch all user's vibe-generated stories
  const { data: stories, error } = await supabase
    .from('books')
    .select('id, title, status, created_at, core_question, cover_url, cover_status')
    .eq('owner_id', user?.id)
    .eq('source', 'vibe')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching stories:', error)
  }

  const completedStories = (stories || []).filter(s => s.status === 'final')
  const inProgressStories = (stories || []).filter(s => s.status !== 'final')

  return (
    <div style={{ maxWidth: 800 }}>
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

      {completedStories.length === 0 && inProgressStories.length === 0 ? (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Completed Stories */}
          {completedStories.length > 0 && (
            <section>
              <h2 className="app-label" style={{ marginBottom: '1rem' }}>
                Completed ({completedStories.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {completedStories.map((story) => (
                  <div
                    key={story.id}
                    className="app-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Link
                      href={`/create/read/${story.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        flex: 1,
                        textDecoration: 'none',
                        color: 'inherit'
                      }}
                    >
                      <BookCover
                        coverUrl={story.cover_url}
                        title={story.title}
                        status={story.cover_status as CoverStatus}
                        size="sm"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 className="app-heading-3" style={{ marginBottom: '0.25rem' }}>
                          {story.title}
                        </h3>
                        {story.core_question && (
                          <p className="app-body-sm" style={{
                            marginBottom: '0.5rem',
                            opacity: 0.8,
                            fontStyle: 'italic',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {story.core_question}
                          </p>
                        )}
                        <p className="app-body-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                          <Clock style={{ width: 12, height: 12 }} />
                          {new Date(story.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
                      <Link
                        href={`/reader/${story.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 8,
                          background: 'rgba(212, 165, 116, 0.1)',
                          color: 'var(--amber-warm)',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <BookOpen style={{ width: 14, height: 14 }} />
                        Reader
                      </Link>
                      <Link
                        href={`/create/read/${story.id}`}
                        style={{
                          color: 'var(--moon-soft)',
                          fontSize: '0.875rem',
                          textDecoration: 'none',
                          opacity: 0.7
                        }}
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* In Progress */}
          {inProgressStories.length > 0 && (
            <section>
              <h2 className="app-label" style={{ marginBottom: '1rem' }}>
                In Progress ({inProgressStories.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {inProgressStories.map((story) => (
                  <div
                    key={story.id}
                    className="app-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: 0.7
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        background: 'rgba(26, 39, 68, 0.5)',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <BookOpen style={{ width: 20, height: 20, color: 'var(--moon-soft)' }} />
                      </div>
                      <div>
                        <h3 className="app-heading-3" style={{ marginBottom: '0.25rem' }}>
                          {story.title || 'Untitled'}
                        </h3>
                        <p className="app-body-sm">
                          {story.status === 'drafting' ? 'Generating...' : story.status}
                        </p>
                      </div>
                    </div>
                    <span className="app-badge app-badge-warning">
                      {story.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
