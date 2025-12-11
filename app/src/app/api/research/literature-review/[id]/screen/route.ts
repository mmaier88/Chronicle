import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

/**
 * POST /api/research/literature-review/[id]/screen - Screen sources against criteria
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
    const { source_id, decision, notes, auto_screen } = body

    // Get review with criteria
    const { data: review, error: reviewError } = await supabase
      .from('literature_reviews')
      .select('*')
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Manual screening
    if (!auto_screen && source_id && decision) {
      const { data: screened, error } = await supabase
        .from('review_sources')
        .update({
          screening_decision: decision,
          screening_notes: notes,
          screened_by: user.id,
          screened_at: new Date().toISOString()
        })
        .eq('review_id', reviewId)
        .eq('source_id', source_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Update counts
      await updateReviewCounts(supabase, reviewId)

      return NextResponse.json({ source: screened })
    }

    // Auto-screening with AI
    if (auto_screen) {
      // Get pending sources
      const { data: pendingSources, error: sourcesError } = await supabase
        .from('review_sources')
        .select(`
          *,
          source:sources (id, title, abstract, authors, publication_year)
        `)
        .eq('review_id', reviewId)
        .eq('screening_decision', 'pending')
        .limit(10)

      if (sourcesError) {
        return NextResponse.json({ error: sourcesError.message }, { status: 500 })
      }

      if (!pendingSources || pendingSources.length === 0) {
        return NextResponse.json({ message: 'No pending sources to screen' })
      }

      const results = []

      for (const reviewSource of pendingSources) {
        const source = reviewSource.source as { title?: string; abstract?: string; authors?: string[]; publication_year?: number } | null
        if (!source) continue

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Screen this source for a systematic literature review.

Research Question: ${review.research_question || 'Not specified'}

Inclusion Criteria:
${JSON.stringify(review.inclusion_criteria, null, 2)}

Exclusion Criteria:
${JSON.stringify(review.exclusion_criteria, null, 2)}

Source to Screen:
Title: ${source.title || 'Unknown'}
Authors: ${source.authors?.join(', ') || 'Unknown'}
Year: ${source.publication_year || 'Unknown'}
Abstract: ${source.abstract || 'No abstract available'}

Respond with JSON only:
{
  "decision": "include" | "exclude" | "maybe",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "criteria_met": ["I1", "I2"],
  "criteria_failed": ["E1"]
}`
          }]
        })

        const content = response.content[0]
        if (content.type !== 'text') continue

        try {
          let jsonStr = content.text.trim()
          if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
          }
          const parsed = JSON.parse(jsonStr)

          const { error: updateError } = await supabase
            .from('review_sources')
            .update({
              screening_decision: parsed.decision,
              screening_notes: `AI Screening (${(parsed.confidence * 100).toFixed(0)}% confidence): ${parsed.reasoning}\nCriteria met: ${parsed.criteria_met?.join(', ') || 'None'}\nCriteria failed: ${parsed.criteria_failed?.join(', ') || 'None'}`,
              screened_at: new Date().toISOString()
            })
            .eq('id', reviewSource.id)

          if (!updateError) {
            results.push({
              source_id: reviewSource.source_id,
              decision: parsed.decision,
              confidence: parsed.confidence,
              reasoning: parsed.reasoning
            })
          }
        } catch {
          // Skip sources that fail to parse
        }
      }

      // Update counts
      await updateReviewCounts(supabase, reviewId)

      return NextResponse.json({ screened: results, count: results.length })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Screen sources error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function updateReviewCounts(supabase: Awaited<ReturnType<typeof createClient>>, reviewId: string) {
  const { data: counts } = await supabase
    .from('review_sources')
    .select('screening_decision')
    .eq('review_id', reviewId)

  if (counts) {
    const screened = counts.filter(c => c.screening_decision !== 'pending').length
    const included = counts.filter(c => c.screening_decision === 'include').length
    const excluded = counts.filter(c => c.screening_decision === 'exclude').length

    await supabase
      .from('literature_reviews')
      .update({
        screened_count: screened,
        included_count: included,
        excluded_count: excluded,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
  }
}
