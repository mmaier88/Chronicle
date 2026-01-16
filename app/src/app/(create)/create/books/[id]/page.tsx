import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Book } from '@/types/chronicle'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { BookEditTabs } from '@/components/books/BookEditTabs'
import { EditableBookHeader } from '@/components/books/EditableBookHeader'

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (error || !book) {
    notFound()
  }

  const typedBook = book as Book

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Link
        href="/create/books"
        className="app-nav-link"
        style={{ marginBottom: '1.5rem', display: 'inline-flex' }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Back to Books
      </Link>

      {/* Header with title and regenerate button */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid rgba(250, 246, 237, 0.1)',
      }}>
        <div>
          <EditableBookHeader book={typedBook} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <span className={typedBook.status === 'drafting' ? 'app-badge app-badge-warning' : typedBook.status === 'editing' ? 'app-badge app-badge-info' : 'app-badge app-badge-success'}>
              {typedBook.status}
            </span>
            <span className="app-body-sm" style={{ opacity: 0.7 }}>
              {typedBook.genre === 'non_fiction' ? 'Non-Fiction' : 'Literary Fiction'}
            </span>
          </div>
        </div>

        <Link
          href={`/create/regenerate/${typedBook.id}`}
          className="app-button-secondary"
          style={{ flexShrink: 0 }}
        >
          Regenerate Book
          <ExternalLink style={{ width: 14, height: 14 }} />
        </Link>
      </div>

      {/* Tabs */}
      <BookEditTabs book={typedBook} />
    </div>
  )
}
