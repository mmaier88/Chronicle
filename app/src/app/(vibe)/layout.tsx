import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default async function VibeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-amber-50/40">
      {/* Minimal header */}
      <header className="sticky top-0 z-50 bg-amber-50/80 backdrop-blur-sm border-b border-amber-100/50">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/vibe"
            className="flex items-center gap-2 text-amber-900 hover:text-amber-700 transition-colors"
          >
            <Sparkles className="w-5 h-5 text-amber-600" />
            <span className="font-serif text-lg font-medium tracking-tight">Vibe a Book</span>
          </Link>

          <Link
            href="/books"
            className="text-sm text-amber-700/60 hover:text-amber-800 transition-colors"
          >
            Author mode
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {children}
      </main>

      {/* Subtle footer */}
      <footer className="max-w-4xl mx-auto px-6 py-8 text-center">
        <p className="text-xs text-amber-600/50">Made with curiosity</p>
      </footer>
    </div>
  )
}
