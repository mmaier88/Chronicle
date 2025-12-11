import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/research/literature-review/[id]/sources - Get sources for a review
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const decision = searchParams.get('decision')

    let query = supabase
      .from('review_sources')
      .select(`
        *,
        source:sources (*)
      `)
      .eq('review_id', reviewId)

    if (decision) {
      query = query.eq('screening_decision', decision)
    }

    const { data: sources, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sources })
  } catch (error) {
    console.error('List review sources error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/research/literature-review/[id]/sources - Add sources to a review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { source_ids } = body

    if (!source_ids || !Array.isArray(source_ids) || source_ids.length === 0) {
      return NextResponse.json({ error: 'source_ids array required' }, { status: 400 })
    }

    // Add sources to review
    const reviewSources = source_ids.map((source_id: string) => ({
      review_id: reviewId,
      source_id,
      screening_decision: 'pending'
    }))

    const { data: added, error } = await supabase
      .from('review_sources')
      .upsert(reviewSources, { onConflict: 'review_id,source_id' })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update review statistics
    const { count } = await supabase
      .from('review_sources')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId)

    await supabase
      .from('literature_reviews')
      .update({ total_sources: count || 0, updated_at: new Date().toISOString() })
      .eq('id', reviewId)

    return NextResponse.json({ sources: added, total: count }, { status: 201 })
  } catch (error) {
    console.error('Add review sources error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
