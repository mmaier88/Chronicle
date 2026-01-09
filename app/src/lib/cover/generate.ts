/**
 * Cover Image Generation
 *
 * Generates constrained images using Gemini.
 * NEVER generates "book covers" - only standalone image assets.
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const IMAGE_MODEL = 'gemini-2.0-flash-exp' // Using experimental model for image generation

function getApiKey(): string {
  const key = process.env.GOOGLE_API_KEY
  if (!key) {
    throw new Error('GOOGLE_API_KEY environment variable is required')
  }
  return key
}

interface GeminiImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
        inlineData?: {
          mimeType: string
          data: string
        }
      }>
    }
  }>
  error?: {
    message: string
    status: string
  }
}

/**
 * Generate an image using Gemini
 * Returns the image as a Buffer (PNG format)
 */
export async function generateImage(prompt: string): Promise<Buffer> {
  const apiKey = getApiKey()

  const response = await fetch(
    `${GEMINI_API_URL}/${IMAGE_MODEL}:generateContent?key=${apiKey}`,
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
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data: GeminiImageResponse = await response.json()

  if (data.error) {
    throw new Error(`Gemini error: ${data.error.message}`)
  }

  // Find the image in the response
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data
  )

  if (!imagePart?.inlineData?.data) {
    // Log response for debugging
    console.error('Gemini response had no image:', JSON.stringify(data, null, 2))
    throw new Error('No image generated in response')
  }

  // Convert base64 to Buffer
  return Buffer.from(imagePart.inlineData.data, 'base64')
}

/**
 * Generate image with retry logic
 * On failure, retries with same concept but varied parameters
 */
export async function generateImageWithRetry(
  promptBuilder: (attempt: number) => string,
  maxRetries: number = 3
): Promise<Buffer> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const prompt = promptBuilder(attempt)
      return await generateImage(prompt)
    } catch (error) {
      lastError = error as Error
      console.error(`Image generation attempt ${attempt + 1} failed:`, error)

      if (attempt < maxRetries - 1) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }

  throw lastError || new Error('Image generation failed after retries')
}
