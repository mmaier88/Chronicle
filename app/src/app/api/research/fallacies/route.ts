import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const FALLACY_TYPES = [
  'ad_hominem',
  'straw_man',
  'false_dichotomy',
  'slippery_slope',
  'appeal_to_authority',
  'appeal_to_emotion',
  'circular_reasoning',
  'hasty_generalization',
  'red_herring',
  'false_cause',
  'equivocation',
  'loaded_question',
  'bandwagon',
  'tu_quoque',
  'no_true_scotsman'
]

/**
 * GET /api/research/fallacies - List detected fallacies
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
    const fallacyType = searchParams.get('type')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    let query = supabase
      .from('detected_fallacies')
      .select('*')
      .eq('workspace_id', workspaceId)

    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    if (fallacyType) {
      query = query.eq('fallacy_type', fallacyType)
    }

    const { data: fallacies, error } = await query.order('detected_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ fallacies, types: FALLACY_TYPES })
  } catch (error) {
    console.error('List fallacies error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/research/fallacies - Detect fallacies in content
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspace_id, document_id, argument_node_id, content } = body

    if (!workspace_id || !content) {
      return NextResponse.json({ error: 'workspace_id and content required' }, { status: 400 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Analyze this text for logical fallacies.

Text to analyze:
${content}

Known fallacy types: ${FALLACY_TYPES.join(', ')}

Respond with JSON only:
{
  "fallacies": [
    {
      "type": "fallacy_type from the list",
      "description": "Explanation of why this is a fallacy",
      "excerpt": "The specific text containing the fallacy",
      "severity": "low" | "medium" | "high",
      "suggestion": "How to fix or avoid this fallacy"
    }
  ],
  "overall_quality": 0.0-1.0,
  "summary": "Brief summary of argument quality"
}`
      }]
    })

    const responseContent = response.content[0]
    if (responseContent.type !== 'text') {
      return NextResponse.json({ error: 'Failed to analyze content' }, { status: 500 })
    }

    let jsonStr = responseContent.text.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
    }

    const parsed = JSON.parse(jsonStr)
    const detectedFallacies = []

    // Save detected fallacies
    for (const fallacy of parsed.fallacies || []) {
      const { data: saved, error: saveError } = await supabase
        .from('detected_fallacies')
        .insert({
          workspace_id,
          document_id,
          argument_node_id,
          fallacy_type: fallacy.type,
          description: fallacy.description,
          excerpt: fallacy.excerpt,
          severity: fallacy.severity,
          suggestion: fallacy.suggestion
        })
        .select()
        .single()

      if (!saveError && saved) {
        detectedFallacies.push(saved)
      }
    }

    return NextResponse.json({
      fallacies: detectedFallacies,
      overall_quality: parsed.overall_quality,
      summary: parsed.summary
    }, { status: 201 })
  } catch (error) {
    console.error('Detect fallacies error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
