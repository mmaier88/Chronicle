/**
 * Cover Image Prompt Builder
 *
 * Builds constrained prompts for Gemini image generation.
 * NEVER mentions "book cover" - generates standalone image assets.
 */

import { Concept } from './concept'

export type Track = 'EDITORIAL_MINIMAL' | 'PHOTOGRAPHIC_REALISM'

export interface PromptConfig {
  concept: Concept
  track?: Track
  attempt?: number // For regeneration variation
}

/**
 * Background color palette for EDITORIAL_MINIMAL track
 * Muted, sophisticated colors that work well with typography
 */
const BACKGROUND_COLORS = [
  'warm off-white',
  'soft cream',
  'pale grey',
  'muted sage',
  'dusty rose',
  'faded terracotta',
  'soft charcoal',
  'warm beige',
  'pale blue-grey',
  'muted ochre',
]

/**
 * Build the image generation prompt
 * CRITICAL: Never mention "book cover" or any layout concepts
 */
export function buildImagePrompt(config: PromptConfig): string {
  const { concept, track = 'EDITORIAL_MINIMAL', attempt = 0 } = config

  // Vary background color on regeneration attempts
  const bgIndex = attempt % BACKGROUND_COLORS.length
  const backgroundColor = BACKGROUND_COLORS[bgIndex]

  // Build avoid list from concept
  const avoidList = concept.avoid.join(', ')

  if (track === 'EDITORIAL_MINIMAL') {
    return `Create a restrained editorial illustration.

Subject: ${concept.visual_metaphor}

Single everyday object only, isolated from context.
The object embodies: ${concept.core_theme}
Emotional quality: ${concept.emotion}

Background: ${backgroundColor}, matte finish, subtle paper texture optional.
Flat, even lighting with soft shadows.
Muted color palette (maximum 3 colors).

Composition:
- IMPORTANT: The object must be LARGE and PROMINENT
- Object occupies approximately 60-70% of the frame width
- Object is the dominant visual element - do not make it tiny
- Centered vertically in the frame
- Some empty space above and below, but the object should feel substantial
- No environment or scenery
- No depth-of-field blur

Style:
- Understated and intentionally restrained
- Editorial magazine aesthetic
- High-quality still life photography feel
- Clean, professional execution

MANDATORY CONSTRAINTS:
- No text of any kind
- No letters
- No numbers
- No symbols that resemble text
- No words
- No typography

AVOID:
- ${avoidList}
- Cinematic lighting
- Dramatic shadows
- Concept art style
- Fantasy elements
- Sci-fi elements
- Perfect symmetry
- Glowing effects
- Digital painting style
- Trending on ArtStation aesthetic
- Cosmic imagery
- Abstract geometry
- Vortices or swirls
- Floating objects
- Multiple subjects`
  }

  // PHOTOGRAPHIC_REALISM track (future)
  return `Create a high-quality still life photograph.

Subject: ${concept.visual_metaphor}

Single object photographed in a studio setting.
The object suggests: ${concept.core_theme}
Mood: ${concept.emotion}

Background: Seamless ${backgroundColor} backdrop.
Professional studio lighting, soft and even.

Composition:
- IMPORTANT: The object must be LARGE and PROMINENT
- Object occupies approximately 60-70% of the frame width
- Object centered in frame
- Some negative space above and below, but object should feel substantial
- Shot straight-on or with minimal angle

MANDATORY CONSTRAINTS:
- No text of any kind
- No letters, numbers, or symbols
- Pure photography, no graphics

AVOID:
- ${avoidList}
- Over-stylized editing
- Heavy filters
- Multiple objects`
}

/**
 * Get variation parameters for regeneration
 * Keeps the same object but varies presentation
 */
export function getRegenerationVariation(attempt: number): {
  scaleHint: string
  distanceHint: string
} {
  const scales = ['slightly smaller', 'standard size', 'slightly larger']
  const distances = ['close-up view', 'medium distance', 'pulled back slightly']

  return {
    scaleHint: scales[attempt % scales.length],
    distanceHint: distances[attempt % distances.length],
  }
}
