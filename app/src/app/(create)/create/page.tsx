import { createClient, getUser } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles, BookOpen } from 'lucide-react'

export default async function CreateLandingPage() {
  const supabase = await createClient()
  const { user } = await getUser()

  // Fetch user's recent completed books (hide skeletons/in-progress)
  const { data: recentBooks } = await supabase
    .from('books')
    .select('id, title, status, created_at')
    .eq('owner_id', user?.id)
    .eq('source', 'vibe')
    .eq('status', 'final')
    .order('created_at', { ascending: false })
    .limit(3)

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
                  <div style={{
                    width: 48,
                    height: 48,
                    background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.2), rgba(212, 165, 116, 0.1))',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <BookOpen style={{ width: 20, height: 20, color: 'var(--amber-warm)' }} />
                  </div>
                  <div>
                    <h3 className="app-heading-3" style={{ marginBottom: '0.25rem' }}>
                      {book.title}
                    </h3>
                    <p className="app-body-sm">
                      {new Date(book.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
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
    </div>
  )
}
