import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

/**
 * GET /api/research/literature-review - List literature reviews
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

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    const { data: reviews, error } = await supabase
      .from('literature_reviews')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('List reviews error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/research/literature-review - Create a literature review
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspace_id, title, description, research_question, inclusion_criteria, exclusion_criteria } = body

    if (!workspace_id || !title) {
      return NextResponse.json({ error: 'workspace_id and title required' }, { status: 400 })
    }

    // Generate PRISMA-compliant criteria if not provided
    let generatedCriteria = { inclusion: inclusion_criteria, exclusion: exclusion_criteria }

    if (research_question && (!inclusion_criteria || !exclusion_criteria)) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Generate inclusion and exclusion criteria for a systematic literature review.

Research Question: ${research_question}

Provide PRISMA-compliant criteria in JSON:
{
  "inclusion_criteria": [
    {"id": "I1", "category": "Population/Topic", "criterion": "..."},
    {"id": "I2", "category": "Study Type", "criterion": "..."}
  ],
  "exclusion_criteria": [
    {"id": "E1", "category": "Language", "criterion": "..."},
    {"id": "E2", "category": "Quality", "criterion": "..."}
  ]
}

Only return valid JSON.`
        }]
      })

      const content = response.content[0]
      if (content.type === 'text') {
        try {
          let jsonStr = content.text.trim()
          if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
          const parsed = JSON.parse(jsonStr)
          generatedCriteria = {
            inclusion: parsed.inclusion_criteria || [],
            exclusion: parsed.exclusion_criteria || []
          }
        } catch {
          // Use defaults
        }
      }
    }

    const { data: review, error } = await supabase
      .from('literature_reviews')
      .insert({
        workspace_id,
        title,
        description,
        research_question,
        inclusion_criteria: generatedCriteria.inclusion || [],
        exclusion_criteria: generatedCriteria.exclusion || [],
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
