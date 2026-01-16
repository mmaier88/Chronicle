import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Chapter, Section } from '@/types/chronicle'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface ChapterUpdate {
  id: string
  title?: string
  purpose?: string
  central_claim?: string
}

interface SectionUpdate {
  id: string
  title?: string
  goal?: string
  local_claim?: string
}

interface OutlineUpdateRequest {
  chapters?: ChapterUpdate[]
  sections?: SectionUpdate[]
}

/**
 * PATCH /api/books/[id]/outline
 *
 * Updates multiple chapters and sections in one request.
 * Only updates provided fields.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify ownership
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  // Parse the request body
  let body: OutlineUpdateRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { chapters, sections } = body
  const errors: string[] = []

  // Update chapters
  if (chapters && Array.isArray(chapters)) {
    for (const chapter of chapters) {
      if (!chapter.id) continue

      // Verify chapter belongs to this book
      const { data: existingChapter, error: chapterError } = await supabase
        .from('chapters')
        .select('id')
        .eq('id', chapter.id)
        .eq('book_id', id)
        .single()

      if (chapterError || !existingChapter) {
        errors.push(`Chapter ${chapter.id} not found or does not belong to this book`)
        continue
      }

      // Build update object with only provided fields
      const updateData: Partial<Chapter> = {}
      if (chapter.title !== undefined) updateData.title = chapter.title
      if (chapter.purpose !== undefined) updateData.purpose = chapter.purpose
      if (chapter.central_claim !== undefined) updateData.central_claim = chapter.central_claim

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('chapters')
          .update(updateData)
          .eq('id', chapter.id)

        if (updateError) {
          errors.push(`Failed to update chapter ${chapter.id}: ${updateError.message}`)
        }
      }
    }
  }

  // Update sections
  if (sections && Array.isArray(sections)) {
    for (const section of sections) {
      if (!section.id) continue

      // Verify section belongs to a chapter in this book
      const { data: existingSection, error: sectionError } = await supabase
        .from('sections')
        .select('id, chapters!inner(book_id)')
        .eq('id', section.id)
        .single()

      if (sectionError || !existingSection) {
        errors.push(`Section ${section.id} not found`)
        continue
      }

      // Check that the section's chapter belongs to this book
      const sectionWithChapter = existingSection as unknown as { id: string; chapters: { book_id: string } }
      if (sectionWithChapter.chapters?.book_id !== id) {
        errors.push(`Section ${section.id} does not belong to this book`)
        continue
      }

      // Build update object with only provided fields
      const updateData: Partial<Section> = {}
      if (section.title !== undefined) updateData.title = section.title
      if (section.goal !== undefined) updateData.goal = section.goal
      if (section.local_claim !== undefined) updateData.local_claim = section.local_claim

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('sections')
          .update(updateData)
          .eq('id', section.id)

        if (updateError) {
          errors.push(`Failed to update section ${section.id}: ${updateError.message}`)
        }
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({
      success: false,
      errors,
      message: 'Some updates failed'
    }, { status: 207 }) // Multi-Status
  }

  return NextResponse.json({ success: true })
}
