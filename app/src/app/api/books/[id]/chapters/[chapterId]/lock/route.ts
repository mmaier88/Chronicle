import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  const { id, chapterId } = await params
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

  // Get chapter
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', chapterId)
    .eq('book_id', id)
    .single()

  if (chapterError || !chapter) {
    return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
  }

  if (chapter.status === 'locked' || chapter.status === 'canonical') {
    return NextResponse.json({ error: 'Chapter is already locked' }, { status: 400 })
  }

  // Check if all sections are canonical
  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select('id, status')
    .eq('chapter_id', chapterId)

  if (sectionsError) {
    return NextResponse.json({ error: 'Failed to check sections' }, { status: 500 })
  }

  const nonCanonicalSections = sections?.filter(s => s.status !== 'canonical') || []
  if (nonCanonicalSections.length > 0) {
    return NextResponse.json({
      error: 'All sections must be canonical before locking chapter',
      nonCanonicalCount: nonCanonicalSections.length,
    }, { status: 400 })
  }

  // Lock the chapter
  const { error: updateError } = await supabase
    .from('chapters')
    .update({ status: 'locked' })
    .eq('id', chapterId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to lock chapter' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Chapter locked. All sections are now final.',
  })
}
