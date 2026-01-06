import { getUser } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles, BookOpen, User, LogOut } from 'lucide-react'

export default async function VibeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isDevUser } = await getUser()

  return (
    <div className="min-h-screen bg-amber-50/40">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-amber-50/80 backdrop-blur-sm border-b border-amber-100/50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/vibe"
              className="flex items-center gap-2 text-amber-900 hover:text-amber-700 transition-colors"
            >
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span className="font-serif text-lg font-medium tracking-tight">Chronicle</span>
            </Link>

            <Link
              href="/vibe/books"
              className="flex items-center gap-1.5 text-sm text-amber-700/70 hover:text-amber-800 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Your Books
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="flex items-center gap-2 text-sm text-amber-700/70">
                  <User className="w-4 h-4" />
                  {isDevUser ? 'Guest Mode' : user.email}
                </div>
                {!isDevUser && (
                  <form action="/api/auth/signout" method="POST">
                    <button
                      type="submit"
                      className="flex items-center gap-1 text-sm text-amber-600/70 hover:text-amber-800 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </form>
                )}
              </>
            )}
            {!user && (
              <Link
                href="/login"
                className="text-sm text-amber-700 hover:text-amber-900 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {children}
      </main>

      {/* Subtle footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 text-center">
        <p className="text-xs text-amber-600/50">Stories made for you</p>
      </footer>
    </div>
  )
}
