/**
 * Cover Concept Distillation
 *
 * Uses Gemini (text only) to extract a visual concept from story metadata.
 * NO style adjectives, NO colors, NO composition - just the core metaphor.
 */

import { z } from 'zod'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODEL = 'gemini-2.0-flash'

function getApiKey(): string {
  const key = process.env.GOOGLE_API_KEY
  if (!key) {
    throw new Error('GOOGLE_API_KEY environment variable is required')
  }
  return key
}

/**
 * Concept distillation output schema
 */
export const ConceptSchema = z.object({
  core_theme: z.string().describe('Single word or short phrase capturing the emotional core'),
  visual_metaphor: z.string().describe('A single everyday object that embodies the theme'),
  emotion: z.string().describe('The feeling the image should evoke'),
  avoid: z.array(z.string()).describe('Visual tropes to avoid'),
})

export type Concept = z.infer<typeof ConceptSchema>

export interface ConceptInput {
  summary: string
  genre: string
  mood?: string
  timePeriod?: string
}

const SYSTEM_PROMPT = `You are a visual concept distiller for book covers.

Your job is to extract ONE everyday object that could represent the story's essence.

RULES:
- Output ONLY valid JSON
- Pick ONE concrete, everyday object (not abstract concepts)
- The object should be mundane but meaningful in context
- NO style words (no "ethereal", "mystical", "vibrant")
- NO colors
- NO composition suggestions
- NO art direction
- The metaphor must be a PHYSICAL OBJECT that exists in the real world

Good metaphors: "an empty chair", "a half-eaten apple", "a set of house keys", "a wilted flower", "a cracked mirror"
Bad metaphors: "the weight of time", "shattered dreams", "cosmic void", "swirling emotions"

The avoid list should include visual clichés for this genre.`

/**
 * Distill story metadata into a visual concept
 */
export async function distillConcept(input: ConceptInput): Promise<Concept> {
  const apiKey = getApiKey()

  const userPrompt = `Distill this story into a single visual concept.

STORY SUMMARY: ${input.summary}
GENRE: ${input.genre}
${input.mood ? `MOOD: ${input.mood}` : ''}
${input.timePeriod ? `TIME PERIOD: ${input.timePeriod}` : ''}

Return ONLY valid JSON with these exact fields:
{
  "core_theme": "one word or short phrase",
  "visual_metaphor": "a single everyday object",
  "emotion": "the feeling to evoke",
  "avoid": ["list", "of", "visual", "clichés", "to", "avoid"]
}`

  const response = await fetch(
    `${GEMINI_API_URL}/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('No response from Gemini')
  }

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in response')
  }

  const parsed = JSON.parse(jsonMatch[0])
  return ConceptSchema.parse(parsed)
}
