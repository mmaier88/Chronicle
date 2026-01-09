/**
 * Cover Quality Gates
 *
 * Automatic rejection for:
 * 1. Text detection (OCR via Gemini Vision)
 * 2. Similarity to recent covers
 * 3. Slop pattern detection
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const VISION_MODEL = 'gemini-2.0-flash'

function getApiKey(): string {
  const key = process.env.GOOGLE_API_KEY
  if (!key) {
    throw new Error('GOOGLE_API_KEY environment variable is required')
  }
  return key
}

export interface QualityCheckResult {
  passed: boolean
  reason?: string
  checks: {
    textDetection: { passed: boolean; details?: string }
    slopPatterns: { passed: boolean; details?: string }
  }
}

/**
 * Known slop patterns that indicate low-quality AI generation
 */
const SLOP_PATTERNS = [
  'vortex',
  'swirl',
  'spiral',
  'glow',
  'glowing',
  'cosmic',
  'galaxy',
  'nebula',
  'portal',
  'floating',
  'levitating',
  'symmetrical pattern',
  'perfect symmetry',
  'geometric pattern',
  'abstract geometry',
  'ethereal',
  'mystical aura',
  'magical particles',
  'sparkles',
  'lens flare',
]

/**
 * Check image for text using Gemini Vision
 */
async function checkForText(imageBase64: string): Promise<{ hasText: boolean; details?: string }> {
  const apiKey = getApiKey()

  const response = await fetch(
    `${GEMINI_API_URL}/${VISION_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Analyze this image for ANY text, letters, numbers, or symbols that resemble text.

Be extremely strict. Look for:
- Any letters (even partial or stylized)
- Any numbers
- Any text-like symbols
- Any typography elements
- Any words or word fragments

Respond with ONLY valid JSON:
{
  "has_text": true/false,
  "detected_text": "description of what was found" or null
}`,
              },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 200,
        },
      }),
    }
  )

  if (!response.ok) {
    // If vision check fails, allow the image (fail open)
    console.error('Vision check failed:', await response.text())
    return { hasText: false }
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    return { hasText: false }
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        hasText: parsed.has_text === true,
        details: parsed.detected_text || undefined,
      }
    }
  } catch {
    // Parse error - fail open
  }

  return { hasText: false }
}

/**
 * Check image for slop patterns using Gemini Vision
 */
async function checkForSlopPatterns(imageBase64: string): Promise<{ hasSlop: boolean; details?: string }> {
  const apiKey = getApiKey()

  const response = await fetch(
    `${GEMINI_API_URL}/${VISION_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Analyze this image for common AI-generated "slop" patterns.

Check for ANY of these:
- Vortices, swirls, or spirals
- Glowing effects or auras
- Cosmic/galaxy/nebula imagery
- Portals or dimensional effects
- Floating/levitating objects
- Perfect symmetry
- Geometric abstract patterns
- Ethereal or mystical elements
- Magical particles or sparkles
- Lens flares
- Multiple focal points
- Busy, cluttered composition
- Overly dramatic lighting

Respond with ONLY valid JSON:
{
  "has_slop_patterns": true/false,
  "detected_patterns": ["list", "of", "patterns"] or []
}`,
              },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 300,
        },
      }),
    }
  )

  if (!response.ok) {
    // If check fails, allow the image
    console.error('Slop check failed:', await response.text())
    return { hasSlop: false }
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    return { hasSlop: false }
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const patterns = parsed.detected_patterns || []
      return {
        hasSlop: parsed.has_slop_patterns === true && patterns.length > 0,
        details: patterns.length > 0 ? patterns.join(', ') : undefined,
      }
    }
  } catch {
    // Parse error - fail open
  }

  return { hasSlop: false }
}

/**
 * Run all quality checks on an image
 */
export async function runQualityChecks(imageBuffer: Buffer): Promise<QualityCheckResult> {
  const imageBase64 = imageBuffer.toString('base64')

  // Run checks in parallel
  const [textResult, slopResult] = await Promise.all([
    checkForText(imageBase64),
    checkForSlopPatterns(imageBase64),
  ])

  const textPassed = !textResult.hasText
  const slopPassed = !slopResult.hasSlop
  const allPassed = textPassed && slopPassed

  let reason: string | undefined
  if (!textPassed) {
    reason = `Text detected: ${textResult.details || 'unknown'}`
  } else if (!slopPassed) {
    reason = `Slop patterns detected: ${slopResult.details || 'unknown'}`
  }

  return {
    passed: allPassed,
    reason,
    checks: {
      textDetection: {
        passed: textPassed,
        details: textResult.details,
      },
      slopPatterns: {
        passed: slopPassed,
        details: slopResult.details,
      },
    },
  }
}

/**
 * Quick text-only check (faster, for initial screening)
 */
export async function quickTextCheck(imageBuffer: Buffer): Promise<boolean> {
  const result = await checkForText(imageBuffer.toString('base64'))
  return !result.hasText
}
