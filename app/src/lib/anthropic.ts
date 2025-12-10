import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client (will be undefined if no API key)
let anthropicClient: Anthropic | null = null

export function getAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
  }

  return anthropicClient
}

export type AIEditAction =
  | 'summarize'
  | 'rewrite'
  | 'expand'
  | 'shorten'
  | 'define'
  | 'humanize'
  | 'style_match'
  | 'persona'
  | 'obfuscate'
  | 'continue'

const ACTION_PROMPTS: Record<AIEditAction, string> = {
  summarize: 'Summarize the following text concisely while preserving the key points:',
  rewrite: 'Rewrite the following text to improve clarity, flow, and readability while preserving the meaning:',
  expand: 'Expand the following text with more detail, examples, and depth while maintaining the original tone:',
  shorten: 'Make the following text more concise without losing essential meaning:',
  define: 'Explain the key terms and concepts in the following text in simple, clear language:',
  humanize: 'Rewrite the following text to sound more natural and conversational, as if written by a human:',
  style_match: 'Rewrite the following text to match a professional academic writing style:',
  persona: 'Rewrite the following text maintaining the same meaning but with a different perspective:',
  obfuscate: 'Anonymize any identifying information (names, places, organizations) in the following text while preserving meaning:',
  continue: 'Continue writing from where this text ends, maintaining the same style and topic:'
}

export interface AIEditOptions {
  action: AIEditAction
  text: string
  context?: string // Additional context like surrounding text
  styleReference?: string // Reference text for style_match
  personaDescription?: string // Description for persona mode
}

export interface AIEditResult {
  success: boolean
  result?: string
  error?: string
  tokensUsed?: {
    input: number
    output: number
  }
}

export async function performAIEdit(options: AIEditOptions): Promise<AIEditResult> {
  const client = getAnthropicClient()

  if (!client) {
    return {
      success: false,
      error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to environment variables.'
    }
  }

  const { action, text, context, styleReference, personaDescription } = options

  // Build the prompt
  let systemPrompt = 'You are a helpful writing assistant. Provide only the modified text without any explanation, preamble, or commentary. Do not include phrases like "Here is the..." or wrap the text in quotes.'

  let userPrompt = ACTION_PROMPTS[action] + '\n\n'

  if (context) {
    userPrompt += `Context (surrounding text for reference):\n${context}\n\n`
  }

  if (action === 'style_match' && styleReference) {
    userPrompt += `Style reference (match this writing style):\n${styleReference}\n\n`
  }

  if (action === 'persona' && personaDescription) {
    systemPrompt = `You are a helpful writing assistant. Write as if you are: ${personaDescription}. Provide only the modified text without any explanation.`
  }

  userPrompt += `Text to transform:\n${text}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt
    })

    const textContent = response.content.find(c => c.type === 'text')

    if (!textContent || textContent.type !== 'text') {
      return {
        success: false,
        error: 'No text response from Claude'
      }
    }

    return {
      success: true,
      result: textContent.text,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens
      }
    }
  } catch (error) {
    console.error('AI edit error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
