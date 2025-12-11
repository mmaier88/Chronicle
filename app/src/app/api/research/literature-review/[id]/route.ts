import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/research/literature-review/[id] - Get a literature review
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: review, error } = await supabase
      .from('literature_reviews')
      .select(`
        *,
        review_sources (
          id,
          source_id,
          screening_decision,
          screening_notes,
          quality_score,
          extracted_data,
          extraction_complete,
          source:sources (id, title, authors, publication_year)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Get review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/research/literature-review/[id] - Update a literature review
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      research_question,
      current_stage,
      inclusion_criteria,
      exclusion_criteria,
      quality_criteria
    } = body

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (research_question !== undefined) updates.research_question = research_question
    if (current_stage !== undefined) updates.current_stage = current_stage
    if (inclusion_criteria !== undefined) updates.inclusion_criteria = inclusion_criteria
    if (exclusion_criteria !== undefined) updates.exclusion_criteria = exclusion_criteria
    if (quality_criteria !== undefined) updates.quality_criteria = quality_criteria

    const { data: review, error } = await supabase
      .from('literature_reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Update review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/research/literature-review/[id] - Delete a literature review
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('literature_reviews')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
