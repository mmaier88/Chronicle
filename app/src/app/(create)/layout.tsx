import { getUser, createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles, Settings, Library, Wand2 } from 'lucide-react'
import './app-theme.css'

export default async function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isDevUser } = await getUser()

  // Check if user has any books (for showing Remix link)
  const supabase = await createClient()
  const { count: bookCount } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user?.id)

  const hasBooks = (bookCount || 0) > 0

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-nav">
            <Link href="/create" className="app-logo">
              <Sparkles className="app-logo-icon" />
              <span className="app-logo-text">Chronicle</span>
            </Link>

            <Link href="/create/stories" className="app-nav-link">
              <Library />
              <span>Your Stories</span>
            </Link>

            {hasBooks && (
              <Link href="/create/books" className="app-nav-link">
                <Wand2 />
                <span>Remix</span>
              </Link>
            )}
          </div>

          <div className="app-user">
            {user ? (
              <Link href="/create/settings" className="app-nav-link" title="Settings">
                <Settings />
                <span className="app-nav-label-mobile">Settings</span>
              </Link>
            ) : (
              <Link href="/login" className="app-signin">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {children}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p className="app-footer-text">Stories made for you</p>
      </footer>
    </div>
  )
}
