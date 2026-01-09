import { createClient, getUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { VibePreview } from '@/types/chronicle'
import { z } from 'zod'
import {
  apiSuccess,
  ApiErrors,
  validateBody,
  isApiError,
  bookGenreSchema,
  vibePreviewSchema,
} from '@/lib/api-utils'

const anthropic = new Anthropic()

// Request schema with Zod
const previewRequestSchema = z.object({
  genre: bookGenreSchema,
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(2000),
  existingPreview: vibePreviewSchema.partial().optional(),
})

// Robust JSON parser that handles common AI output issues
function parseAIJson<T>(text: string): T {
  // Extract JSON from markdown code blocks
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                   text.match(/```\s*([\s\S]*?)\s*```/) ||
                   [null, text]
  let jsonStr = (jsonMatch[1] || text).trim()

  // Try direct parse first
  try {
    return JSON.parse(jsonStr)
  } catch {
    // Try to fix common issues
  }

  // Fix unescaped newlines in strings
  jsonStr = jsonStr.replace(/(?<="[^"]*)\n(?=[^"]*")/g, '\\n')

  // Fix unescaped quotes inside strings
  jsonStr = jsonStr.replace(/([^\\])"(?=[^:,\[\]{}\s])/g, '$1\\"')

  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
  }
}

// IP name guardrails - block obvious copyrighted franchise names
const BLOCKED_FRANCHISES = [
  'harry potter', 'hogwarts', 'voldemort', 'dumbledore',
  'star wars', 'luke skywalker', 'darth vader', 'jedi', 'sith',
  'lord of the rings', 'frodo', 'gandalf', 'mordor', 'middle earth',
  'game of thrones', 'westeros', 'winterfell', 'targaryen', 'lannister',
  'marvel', 'avengers', 'iron man', 'spider-man', 'captain america',
  'dc comics', 'batman', 'superman', 'wonder woman', 'gotham',
  'pokemon', 'pikachu', 'ash ketchum',
  'disney princess', 'frozen', 'elsa',
  'hunger games', 'katniss', 'panem',
  'twilight', 'bella swan', 'edward cullen',
]

function checkForBlockedContent(text: string): string | null {
  const lowerText = text.toLowerCase()
  for (const franchise of BLOCKED_FRANCHISES) {
    if (lowerText.includes(franchise)) {
      return franchise
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { user } = await getUser()

  if (!user) {
    return ApiErrors.unauthorized()
  }

  // Validate request body
  const validated = await validateBody(request, previewRequestSchema)
  if (isApiError(validated)) return validated

  const { genre, prompt, existingPreview } = validated

  // Check for blocked content
  const blockedMatch = checkForBlockedContent(prompt)
  if (blockedMatch) {
    return ApiErrors.badRequest(
      `Your prompt references "${blockedMatch}" which appears to be a copyrighted franchise. Please make your story "inspired by" rather than directly using these characters/worlds.`,
      { blocked: true }
    )
  }

  const genreDescription = genre === 'literary_fiction'
    ? 'literary fiction with rich character development and thematic depth'
    : 'non-fiction with clear arguments and engaging narrative'

  const systemPrompt = `You are a creative writing assistant generating a "back of book" preview for a short book (~30 pages).

IMPORTANT RULES:
1. This preview is SPOILER-LIGHT - do NOT reveal plot twists, endings, or major revelations
2. The preview should read like professional back cover copy that entices readers
3. Keep the tone appropriate for ${genreDescription}
4. Characters should have distinct, memorable names and clear roles
5. The setting should be vivid but not over-detailed
6. The "promise" bullets should capture the emotional/thematic experience

${existingPreview ? `The user has provided an existing preview they want to improve. Incorporate their edits while enhancing the quality:
${JSON.stringify(existingPreview, null, 2)}` : ''}

Return ONLY valid JSON matching this exact schema:
{
  "title": "string (compelling, evocative title)",
  "logline": "string (1-2 sentence hook)",
  "blurb": "string (150-250 words, back cover copy style)",
  "cast": [
    { "name": "string", "tagline": "string (1-line character description)" }
  ],
  "setting": "string (2-4 sentences describing world/time/place)",
  "promise": ["string", "string", "string"],
  "warnings": {
    "violence": "none|low|medium|high",
    "romance": "none|low|medium|high"
  }
}

Requirements:
- cast: 3-6 characters
- promise: exactly 3 bullets describing what readers will experience
- warnings: infer appropriate levels from the prompt content`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Generate a spoiler-light book preview for this ${genre} concept:\n\n${prompt}`
      }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse and validate JSON
    let preview: VibePreview
    try {
      preview = parseAIJson<VibePreview>(responseText)

      // Validate required fields
      if (!preview.title || !preview.logline || !preview.blurb ||
          !preview.cast || !preview.setting || !preview.promise) {
        throw new Error('Missing required fields')
      }

      // Ensure warnings has defaults
      preview.warnings = preview.warnings || { violence: 'low', romance: 'low' }

    } catch (parseError) {
      console.error('Failed to parse preview JSON:', {
        error: parseError instanceof Error ? parseError.message : parseError,
        responseText: responseText.substring(0, 500),
        userId: user.id,
      })
      return ApiErrors.internal('Failed to generate valid preview. Please try again.')
    }

    // Log AI job
    await supabase.from('ai_jobs').insert({
      book_id: null as unknown as string, // No book yet
      user_id: user.id,
      target_type: 'constitution', // Closest match
      target_id: null,
      model_name: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })

    return apiSuccess({ preview })

  } catch (error) {
    console.error('Preview generation error:', error)
    return ApiErrors.internal('Failed to generate preview')
  }
}
