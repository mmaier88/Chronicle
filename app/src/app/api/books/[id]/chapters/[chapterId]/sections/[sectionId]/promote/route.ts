import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string; sectionId: string }> }
) {
  const { id, chapterId, sectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify book ownership
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  // Get section
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('*')
    .eq('id', sectionId)
    .eq('chapter_id', chapterId)
    .single()

  if (sectionError || !section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 })
  }

  if (section.status === 'canonical') {
    return NextResponse.json({ error: 'Section is already canonical' }, { status: 400 })
  }

  // Check if section has content
  if (!section.content_text || section.content_text.trim().length === 0) {
    return NextResponse.json({ error: 'Cannot promote empty section' }, { status: 400 })
  }

  // Promote to canonical
  const { error: updateError } = await supabase
    .from('sections')
    .update({
      status: 'canonical',
      promoted_at: new Date().toISOString(),
      promoted_by: user.id,
    })
    .eq('id', sectionId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to promote section' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    promoted_at: new Date().toISOString(),
    message: 'Section promoted to canonical. It is now eligible for embedding.',
  })
}
