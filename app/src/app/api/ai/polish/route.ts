import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { FULL_POLISH_PROMPT, QUICK_POLISH_PROMPT, countPatterns } from '@/lib/polish-pipeline'

const anthropic = new Anthropic()

interface PolishRequest {
  text: string
  mode?: 'full' | 'quick'
  characters?: { name: string; role: string }[]
  bookId?: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: PolishRequest = await request.json()
  const { text, mode = 'quick', characters = [], bookId } = body

  if (!text || text.trim().length < 100) {
    return NextResponse.json({ error: 'Text too short to polish' }, { status: 400 })
  }

  // Count patterns before polishing
  const beforeMetrics = countPatterns(text)
  const wordCountBefore = text.split(/\s+/).length

  // Build character context if provided
  const characterContext = characters.length > 0
    ? `\n\nCHARACTERS TO ADD MESS BEATS FOR:\n${characters.map(c => `- ${c.name}: ${c.role}`).join('\n')}`
    : ''

  const systemPrompt = mode === 'full' ? FULL_POLISH_PROMPT : QUICK_POLISH_PROMPT

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: `${systemPrompt}${characterContext}`,
      messages: [{
        role: 'user',
        content: `Polish this prose:\n\n${text}`
      }],
    })

    const polishedText = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : text

    // Count patterns after polishing
    const afterMetrics = countPatterns(polishedText)
    const wordCountAfter = polishedText.split(/\s+/).length

    // Log AI job if bookId provided
    if (bookId) {
      await supabase.from('ai_jobs').insert({
        book_id: bookId,
        user_id: user.id,
        target_type: 'polish',
        target_id: bookId,
        model_name: 'claude-sonnet-4-20250514',
        provider: 'anthropic',
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      polished: polishedText,
      metrics: {
        wordCountBefore,
        wordCountAfter,
        reductionPercent: Math.round((1 - wordCountAfter / wordCountBefore) * 100),
        themeLabelsBefore: beforeMetrics.themeLabels,
        themeLabelsAfter: afterMetrics.themeLabels,
        realizedCountBefore: beforeMetrics.realizedCount,
        realizedCountAfter: afterMetrics.realizedCount,
        aphorismsBefore: beforeMetrics.aphorisms,
        aphorismsAfter: afterMetrics.aphorisms,
      }
    })

  } catch (error) {
    console.error('Polish error:', error)
    return NextResponse.json(
      { error: 'Polish failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
