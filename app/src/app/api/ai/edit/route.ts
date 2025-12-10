import { createClient } from '@/lib/supabase/server'
import { performAIEdit, AIEditAction } from '@/lib/anthropic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, text, context, styleReference, personaDescription, documentId } = body

    // Validate action
    const validActions: AIEditAction[] = [
      'summarize', 'rewrite', 'expand', 'shorten', 'define',
      'humanize', 'style_match', 'persona', 'obfuscate', 'continue'
    ]

    if (!action || !validActions.includes(action)) {
      return NextResponse.json({
        error: `Invalid action. Valid actions: ${validActions.join(', ')}`
      }, { status: 400 })
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Perform the AI edit
    const result = await performAIEdit({
      action,
      text: text.trim(),
      context,
      styleReference,
      personaDescription
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Log the AI job for provenance tracking
    try {
      await supabase.from('ai_jobs').insert({
        user_id: user.id,
        document_id: documentId || null,
        job_type: 'text_edit',
        model: 'claude-sonnet-4-20250514',
        prompt_tokens: result.tokensUsed?.input || 0,
        completion_tokens: result.tokensUsed?.output || 0,
        metadata: {
          action,
          input_length: text.length,
          output_length: result.result?.length || 0
        }
      })
    } catch (logError) {
      // Don't fail the request if logging fails
      console.warn('Failed to log AI job:', logError)
    }

    return NextResponse.json({
      success: true,
      action,
      original: text,
      result: result.result,
      tokensUsed: result.tokensUsed
    })

  } catch (error) {
    console.error('AI edit handler error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
