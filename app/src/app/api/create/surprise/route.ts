import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const STORY_THEMES = [
  'isolation and connection',
  'memory and identity',
  'loss and renewal',
  'secrets and revelation',
  'time and change',
  'belonging and exile',
  'truth and deception',
  'legacy and forgetting',
  'hope and despair',
  'transformation and stasis',
]

const SETTINGS = [
  'a coastal town',
  'an old library',
  'a night train',
  'a forgotten garden',
  'a lighthouse',
  'a bookshop',
  'an abandoned theater',
  'a small island',
  'an antique shop',
  'a mountain cabin',
]

export async function POST() {
  try {
    const theme = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)]
    const setting = SETTINGS[Math.floor(Math.random() * SETTINGS.length)]

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Generate a single intriguing story premise (2-3 sentences) for a literary fiction book.

Theme to explore: ${theme}
Setting hint: ${setting}

Requirements:
- Start with a compelling character or situation
- Include a mystery, tension, or unanswered question
- Make it evocative and atmospheric
- Don't use clichés or obvious tropes
- Write in present tense, as if describing the start of something

Just output the premise, nothing else. No quotes.`
      }],
    })

    const content = message.content[0]
    const prompt = content.type === 'text' ? content.text.trim() : ''

    return NextResponse.json({ prompt })
  } catch (error) {
    console.error('Surprise prompt generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate prompt' },
      { status: 500 }
    )
  }
}
