import { getUser } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles, BookOpen, User, LogOut } from 'lucide-react'
import './app-theme.css'

export default async function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isDevUser } = await getUser()

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

            <Link href="/create/books" className="app-nav-link">
              <BookOpen />
              Your Books
            </Link>
          </div>

          <div className="app-user">
            {user && (
              <>
                <div className="app-user-info">
                  <User />
                  {isDevUser ? 'Guest Mode' : user.email}
                </div>
                {!isDevUser && (
                  <form action="/api/auth/signout" method="POST">
                    <button type="submit" className="app-signout">
                      <LogOut />
                      Sign out
                    </button>
                  </form>
                )}
              </>
            )}
            {!user && (
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
