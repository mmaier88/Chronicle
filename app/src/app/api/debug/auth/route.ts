import { NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'

/**
 * Debug endpoint to check auth status
 * GET /api/debug/auth
 */
export async function GET() {
  try {
    const { user } = await getUser()
    const supabase = await createClient()

    // Try to fetch user's books count
    let booksResult = { count: 0, error: null as string | null }
    if (user) {
      const { count, error } = await supabase
        .from('books')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)

      booksResult = { count: count || 0, error: error?.message || null }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
      } : null,
      booksQuery: booksResult,
    })
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
