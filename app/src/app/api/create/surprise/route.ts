import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const STORY_SEEDS = [
  'a secret kept for decades',
  'a letter that arrives too late',
  'a stranger who knows too much',
  'a house with one locked room',
  'a photograph with a missing face',
  'a promise made in childhood',
  'a town that remembers everything',
  'a voice on an old recording',
  'a map to somewhere that shouldn\'t exist',
  'a debt that can\'t be repaid',
]

export async function POST() {
  try {
    const seed = STORY_SEEDS[Math.floor(Math.random() * STORY_SEEDS.length)]

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `Write a 1-2 sentence story idea about: ${seed}

Be specific and intriguing. No clichés. Just the premise, nothing else.`
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
