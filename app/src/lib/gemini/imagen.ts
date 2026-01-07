// Google Gemini Image Generation (Nano Banana)
// Uses Gemini 2.5 Flash Image model for book cover generation

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODEL = 'gemini-2.5-flash-image'

function getApiKey(): string {
  const key = process.env.GOOGLE_API_KEY
  if (!key) {
    throw new Error('GOOGLE_API_KEY environment variable is required')
  }
  return key
}

interface GeminiImageResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string
        inlineData?: {
          mimeType: string
          data: string // base64
        }
      }>
    }
  }>
}

/**
 * Generate a book cover image using Gemini
 * Returns the image as a Buffer (PNG format)
 */
export async function generateCoverImage(prompt: string): Promise<Buffer> {
  const apiKey = getApiKey()

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
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: '2:3', // Book cover aspect ratio (portrait)
            imageSize: '1K',
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data: GeminiImageResponse = await response.json()

  // Find the image in the response
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data
  )

  if (!imagePart?.inlineData?.data) {
    throw new Error('No image generated in response')
  }

  // Convert base64 to Buffer
  return Buffer.from(imagePart.inlineData.data, 'base64')
}

/**
 * Build a cover generation prompt from book metadata
 */
export function buildCoverPrompt(params: {
  title: string
  genre: string
  blurb?: string
  setting?: string
  cast?: Array<{ name: string; tagline: string }>
  narrativeVoice?: string
}): string {
  const { title, genre, blurb, setting, cast, narrativeVoice } = params

  // Determine style based on genre
  const styleGuide =
    genre === 'literary_fiction'
      ? 'elegant, atmospheric, artistic, subtle imagery, muted color palette, evocative'
      : 'clean, professional, modern, sophisticated, thought-provoking imagery'

  // Build context elements
  const contextParts: string[] = []

  if (setting) {
    contextParts.push(`Setting: ${setting}`)
  }

  if (cast && cast.length > 0) {
    const mainCharacter = cast[0]
    contextParts.push(`Main character: ${mainCharacter.name} - ${mainCharacter.tagline}`)
  }

  if (narrativeVoice) {
    contextParts.push(`Tone: ${narrativeVoice}`)
  }

  const context = contextParts.length > 0 ? contextParts.join('. ') + '.' : ''

  // Build the full prompt
  const prompt = `Create a professional book cover design for a ${genre.replace('_', ' ')} book titled "${title}".

${blurb ? `Story: ${blurb}` : ''}
${context}

Style requirements:
- ${styleGuide}
- High-quality book cover suitable for publishing
- No text on the cover (title will be added separately)
- Focus on a compelling central image that captures the book's essence
- Professional quality, suitable for print and digital
- Avoid generic stock photo aesthetics
- Create a unique, memorable visual concept`

  return prompt.trim()
}

/**
 * Generate a book cover with retry logic
 */
export async function generateCoverWithRetry(
  prompt: string,
  maxRetries: number = 3
): Promise<Buffer> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateCoverImage(prompt)
    } catch (error) {
      lastError = error as Error
      console.error(`Cover generation attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  throw lastError || new Error('Cover generation failed after retries')
}
