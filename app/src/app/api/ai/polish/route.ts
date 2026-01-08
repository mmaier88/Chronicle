import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { FULL_POLISH_PROMPT, QUICK_POLISH_PROMPT, countPatterns } from '@/lib/polish-pipeline'
import {
  apiSuccess,
  ApiErrors,
  validateBody,
  isApiError,
  polishSchema,
} from '@/lib/api-utils'

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return ApiErrors.unauthorized()
  }

  // Validate request body
  const validated = await validateBody(request, polishSchema)
  if (isApiError(validated)) return validated

  const { text, mode, characters, bookId } = validated

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

    return apiSuccess({
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
    return ApiErrors.internal(error instanceof Error ? error.message : 'Polish failed')
  }
}
