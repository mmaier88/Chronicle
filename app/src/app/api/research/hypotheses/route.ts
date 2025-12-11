import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

/**
 * GET /api/research/hypotheses - List hypotheses
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    const documentId = searchParams.get('document_id')
    const status = searchParams.get('status')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    let query = supabase
      .from('hypotheses')
      .select('*')
      .eq('workspace_id', workspaceId)

    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: hypotheses, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ hypotheses })
  } catch (error) {
    console.error('List hypotheses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/research/hypotheses - Create or evaluate a hypothesis
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      workspace_id,
      document_id,
      statement,
      rationale,
      evaluate_against_sources
    } = body

    if (!workspace_id || !statement) {
      return NextResponse.json({ error: 'workspace_id and statement required' }, { status: 400 })
    }

    let supportingEvidence: unknown[] = []
    let contradictingEvidence: unknown[] = []
    let confidence: number | null = null

    // Optionally evaluate against sources
    if (evaluate_against_sources) {
      // Get sources with embeddings
      const { data: sources } = await supabase
        .from('sources')
        .select('id, title, abstract')
        .eq('workspace_id', workspace_id)
        .limit(20)

      if (sources && sources.length > 0) {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Evaluate this hypothesis against available sources.

Hypothesis: ${statement}
${rationale ? `Rationale: ${rationale}` : ''}

Available Sources:
${sources.map((s, i) => `${i + 1}. ${s.title}\n   Abstract: ${s.abstract || 'No abstract'}`).join('\n\n')}

Respond with JSON only:
{
  "supporting_evidence": [
    {"source_index": 1, "excerpt": "relevant text", "strength": 0.0-1.0}
  ],
  "contradicting_evidence": [
    {"source_index": 2, "excerpt": "contradicting text", "strength": 0.0-1.0}
  ],
  "overall_confidence": 0.0-1.0,
  "assessment": "Brief assessment of hypothesis viability"
}`
          }]
        })

        const content = response.content[0]
        if (content.type === 'text') {
          try {
            let jsonStr = content.text.trim()
            if (jsonStr.startsWith('```')) {
              jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
            }
            const parsed = JSON.parse(jsonStr)

            supportingEvidence = (parsed.supporting_evidence || []).map((e: { source_index: number; excerpt: string; strength: number }) => ({
              source_id: sources[e.source_index - 1]?.id,
              source_title: sources[e.source_index - 1]?.title,
              excerpt: e.excerpt,
              strength: e.strength
            }))

            contradictingEvidence = (parsed.contradicting_evidence || []).map((e: { source_index: number; excerpt: string; strength: number }) => ({
              source_id: sources[e.source_index - 1]?.id,
              source_title: sources[e.source_index - 1]?.title,
              excerpt: e.excerpt,
              strength: e.strength
            }))

            confidence = parsed.overall_confidence
          } catch {
            // Continue without evaluation
          }
        }
      }
    }

    const { data: hypothesis, error } = await supabase
      .from('hypotheses')
      .insert({
        workspace_id,
        document_id,
        statement,
        rationale,
        status: 'proposed',
        confidence,
        supporting_evidence: supportingEvidence,
        contradicting_evidence: contradictingEvidence,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ hypothesis }, { status: 201 })
  } catch (error) {
    console.error('Create hypothesis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
