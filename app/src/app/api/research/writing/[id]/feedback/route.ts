import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

/**
 * GET /api/research/writing/[id]/feedback - Get feedback for a writing project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const resolved = searchParams.get('resolved')

    let query = supabase
      .from('writing_feedback')
      .select('*')
      .eq('project_id', projectId)

    if (stage) {
      query = query.eq('stage', stage)
    }

    if (resolved !== null) {
      query = query.eq('resolved', resolved === 'true')
    }

    const { data: feedback, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('List feedback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/research/writing/[id]/feedback - Add or generate feedback
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      stage,
      feedback_type,
      content,
      section_id,
      start_offset,
      end_offset,
      auto_generate,
      document_content
    } = body

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('writing_projects')
      .select('*, document:documents (id, title, content)')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const currentStage = stage || project.current_stage

    // Manual feedback
    if (!auto_generate && content) {
      const { data: feedback, error } = await supabase
        .from('writing_feedback')
        .insert({
          project_id: projectId,
          stage: currentStage,
          feedback_type: feedback_type || 'self_note',
          content,
          section_id,
          start_offset,
          end_offset,
          created_by: user.id
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ feedback }, { status: 201 })
    }

    // AI-generated feedback
    if (auto_generate) {
      const textContent = document_content ||
        (typeof project.document?.content === 'string'
          ? project.document.content
          : JSON.stringify(project.document?.content || ''))

      const stagePrompts: Record<string, string> = {
        draft: 'Focus on structure, argument flow, and completeness. Identify missing sections or weak arguments.',
        review: 'Focus on clarity, citation accuracy, and logical consistency. Identify claims that need better support.',
        revision: 'Focus on readability, conciseness, and polish. Suggest sentence-level improvements.',
        finalize: 'Focus on formatting, consistency, and final checks before submission.'
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `Provide detailed writing feedback for this academic document.

Stage: ${currentStage}
Focus: ${stagePrompts[currentStage] || 'General feedback'}

Target: ${project.target_journal || project.target_conference || 'Academic publication'}
Word count target: ${project.word_count_target || 'Not specified'}

Document content:
${textContent.substring(0, 15000)}

Respond with JSON only:
{
  "feedback_items": [
    {
      "type": "structure" | "clarity" | "citation" | "argument" | "style" | "formatting",
      "severity": "suggestion" | "warning" | "critical",
      "content": "Detailed feedback",
      "location": "Where in the document (section/paragraph description)",
      "suggestion": "Specific improvement recommendation"
    }
  ],
  "summary": {
    "strengths": ["List of strengths"],
    "areas_for_improvement": ["List of areas needing work"],
    "readiness_score": 0.0-1.0,
    "recommended_next_steps": ["Prioritized action items"]
  }
}`
        }]
      })

      const responseContent = response.content[0]
      if (responseContent.type !== 'text') {
        return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 })
      }

      let jsonStr = responseContent.text.trim()
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
      }

      const parsed = JSON.parse(jsonStr)
      const savedFeedback = []

      // Save each feedback item
      for (const item of parsed.feedback_items || []) {
        const { data: saved, error: saveError } = await supabase
          .from('writing_feedback')
          .insert({
            project_id: projectId,
            stage: currentStage,
            feedback_type: 'ai_suggestion',
            content: `[${item.type.toUpperCase()}] ${item.content}\n\nLocation: ${item.location}\n\nSuggestion: ${item.suggestion}`,
            created_by: user.id
          })
          .select()
          .single()

        if (!saveError && saved) {
          savedFeedback.push({ ...saved, severity: item.severity, type: item.type })
        }
      }

      return NextResponse.json({
        feedback: savedFeedback,
        summary: parsed.summary
      }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Create feedback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/research/writing/[id]/feedback - Mark feedback as resolved
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params // projectId not needed
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { feedback_id, resolved } = body

    if (!feedback_id) {
      return NextResponse.json({ error: 'feedback_id required' }, { status: 400 })
    }

    const { data: feedback, error } = await supabase
      .from('writing_feedback')
      .update({
        resolved: resolved !== false,
        resolved_at: resolved !== false ? new Date().toISOString() : null
      })
      .eq('id', feedback_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Update feedback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
