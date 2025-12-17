import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify ownership and check if already locked
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  if (book.constitution_locked) {
    return NextResponse.json({ error: 'Constitution is already locked' }, { status: 400 })
  }

  // Verify constitution is complete
  const constitution = book.constitution_json || {}
  const requiredFields = [
    'central_thesis',
    'worldview_frame',
    'narrative_voice',
    'what_book_is_against',
    'what_book_refuses_to_do',
    'ideal_reader',
    'taboo_simplifications',
  ]

  const missingFields = requiredFields.filter(field => !constitution[field])
  if (missingFields.length > 0) {
    return NextResponse.json({
      error: 'Constitution is incomplete',
      missingFields,
    }, { status: 400 })
  }

  // Lock the constitution
  const { error: updateError } = await supabase
    .from('books')
    .update({
      constitution_locked: true,
      constitution_locked_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to lock constitution' }, { status: 500 })
  }

  return NextResponse.json({ success: true, locked_at: new Date().toISOString() })
}
