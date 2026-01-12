import { createClient, getUser, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles, Clock } from 'lucide-react'
import { BookCover } from '@/components/cover/BookCover'
import { CoverStatus } from '@/types/chronicle'
import Image from 'next/image'

export default async function CreateLandingPage() {
  const supabase = await createClient()
  const serviceClient = createServiceClient()
  const { user } = await getUser()

  // Fetch user's recent completed books (hide skeletons/in-progress)
  const { data: recentBooks } = await supabase
    .from('books')
    .select('id, title, status, created_at, cover_url, cover_status, core_question')
    .eq('owner_id', user?.id)
    .eq('source', 'vibe')
    .eq('status', 'final')
    .order('created_at', { ascending: false })
    .limit(3)

  // Fetch staff picks (public books marked by staff)
  const { data: staffPicks } = await serviceClient.rpc('get_staff_picks', { pick_limit: 6 })

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Hero Section */}
      <section style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <p className="app-label" style={{ marginBottom: '1.5rem' }}>
          Stories made for you
        </p>

        <h1 className="app-heading-1" style={{ marginBottom: '1.5rem' }}>
          What story are you<br />in the mood for?
        </h1>

        <p className="app-body" style={{ maxWidth: 540, marginBottom: '2.5rem', opacity: 0.8 }}>
          Share a feeling, a tone, or a spark of an idea — and Chronicle will craft an original book just for you.
        </p>

        <Link href="/create/new" className="app-button-primary">
          <Sparkles style={{ width: 18, height: 18 }} />
          Start a new story
        </Link>
      </section>

      {/* Recent books */}
      {recentBooks && recentBooks.length > 0 && (
        <section>
          <h2 className="app-heading-3" style={{ marginBottom: '1.5rem' }}>Your stories</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentBooks.map((book) => (
              <Link
                key={book.id}
                href={`/create/read/${book.id}`}
                className="app-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <BookCover
                    coverUrl={book.cover_url}
                    title={book.title}
                    status={book.cover_status as CoverStatus}
                    size="sm"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="app-heading-3" style={{ marginBottom: '0.25rem' }}>
                      {book.title}
                    </h3>
                    {book.core_question && (
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
                        {book.core_question}
                      </p>
                    )}
                    <p className="app-body-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                      <Clock style={{ width: 12, height: 12 }} />
                      {new Date(book.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <span style={{ color: 'var(--amber-warm)', fontSize: '0.875rem' }}>
                  Read →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Staff Picks */}
      {staffPicks && staffPicks.length > 0 && (
        <section style={{ marginTop: '3rem' }}>
          <h2 className="app-heading-3" style={{ marginBottom: '0.5rem' }}>Staff Picks</h2>
          <p className="app-body-sm" style={{ marginBottom: '1.5rem', opacity: 0.6 }}>
            Stories we love
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '1rem'
          }}>
            {staffPicks.map((pick: { id: string; title: string; cover_url: string | null; core_question: string | null; share_token: string }) => (
              <Link
                key={pick.id}
                href={`/share/${pick.share_token}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.2s ease'
                }}
                className="staff-pick-card-hover"
              >
                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '2 / 3',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--night-deep)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  marginBottom: '0.5rem'
                }}>
                  {pick.cover_url ? (
                    <Image
                      src={pick.cover_url}
                      alt={pick.title}
                      fill
                      sizes="120px"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(135deg, var(--night-deep) 0%, var(--night-light) 100%)'
                    }} />
                  )}
                </div>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--moon-light)',
                  marginBottom: '0.125rem',
                  lineHeight: 1.3,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {pick.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
