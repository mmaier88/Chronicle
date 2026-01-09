/**
 * Cover Typography & Layout System
 *
 * Deterministic cover composition:
 * - AI generates image assets
 * - Chronicle designs covers (this module)
 *
 * The AI model NEVER sees the title.
 * The AI model NEVER places text.
 */

import sharp from 'sharp'

/**
 * Cover dimensions (standard book cover ratio ~1.6:1)
 */
export const COVER_WIDTH = 1600
export const COVER_HEIGHT = 2560

/**
 * Safe zones for text placement
 */
const TITLE_ZONE = {
  top: 120,
  height: 400,
  paddingX: 100,
}

const AUTHOR_ZONE = {
  bottom: 120,
  height: 200,
  paddingX: 100,
}

/**
 * Font configuration by genre
 * Maps genre to typography style
 */
export type FontStyle = 'serif' | 'sans' | 'mono'

const GENRE_FONTS: Record<string, FontStyle> = {
  literary_fiction: 'serif',
  contemporary: 'sans',
  experimental: 'mono',
  thriller: 'sans',
  mystery: 'serif',
  romance: 'serif',
  scifi: 'sans',
  fantasy: 'serif',
  horror: 'serif',
  default: 'serif',
}

/**
 * SVG text styling by font style
 */
const FONT_STYLES: Record<FontStyle, { family: string; weight: number; letterSpacing: string }> = {
  serif: {
    family: 'Georgia, Times New Roman, serif',
    weight: 400,
    letterSpacing: '0.02em',
  },
  sans: {
    family: 'Helvetica Neue, Arial, sans-serif',
    weight: 500,
    letterSpacing: '0.05em',
  },
  mono: {
    family: 'SF Mono, Menlo, monospace',
    weight: 400,
    letterSpacing: '0.1em',
  },
}

/**
 * Text color based on image brightness
 */
type TextColor = 'light' | 'dark'

export interface ComposeOptions {
  imageBuffer: Buffer
  title: string
  author?: string
  genre?: string
  textColor?: TextColor
}

/**
 * Analyze image to determine optimal text color
 */
async function analyzeImageBrightness(imageBuffer: Buffer): Promise<TextColor> {
  try {
    const { dominant } = await sharp(imageBuffer).stats()

    // Calculate perceived brightness using luminance formula
    const brightness = (dominant.r * 299 + dominant.g * 587 + dominant.b * 114) / 1000

    // If image is bright, use dark text; if dark, use light text
    return brightness > 128 ? 'dark' : 'light'
  } catch {
    // Default to light text on error
    return 'light'
  }
}

/**
 * Create SVG text overlay
 */
function createTextOverlay(
  title: string,
  author: string | undefined,
  fontStyle: FontStyle,
  textColor: TextColor
): string {
  const font = FONT_STYLES[fontStyle]
  const color = textColor === 'light' ? '#FFFFFF' : '#1A1A1A'
  const shadowColor = textColor === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)'

  // Calculate title font size based on length
  const titleLength = title.length
  let titleFontSize = 120
  if (titleLength > 30) titleFontSize = 80
  else if (titleLength > 20) titleFontSize = 100
  else if (titleLength > 10) titleFontSize = 110

  // Wrap title if too long
  const maxCharsPerLine = Math.floor((COVER_WIDTH - TITLE_ZONE.paddingX * 2) / (titleFontSize * 0.5))
  const titleLines = wrapText(title, maxCharsPerLine)

  // Build title SVG
  const titleY = TITLE_ZONE.top + TITLE_ZONE.height / 2
  const titleSvg = titleLines
    .map((line, i) => {
      const y = titleY + i * (titleFontSize * 1.2) - ((titleLines.length - 1) * titleFontSize * 1.2) / 2
      return `<text
        x="${COVER_WIDTH / 2}"
        y="${y}"
        text-anchor="middle"
        font-family="${font.family}"
        font-size="${titleFontSize}"
        font-weight="${font.weight}"
        letter-spacing="${font.letterSpacing}"
        fill="${color}"
        filter="url(#shadow)"
      >${escapeXml(line)}</text>`
    })
    .join('\n')

  // Author SVG (if provided)
  const authorSvg = author
    ? `<text
        x="${COVER_WIDTH / 2}"
        y="${COVER_HEIGHT - AUTHOR_ZONE.bottom}"
        text-anchor="middle"
        font-family="${font.family}"
        font-size="48"
        font-weight="${font.weight}"
        letter-spacing="0.15em"
        fill="${color}"
        opacity="0.9"
        filter="url(#shadow)"
      >${escapeXml(author.toUpperCase())}</text>`
    : ''

  return `<svg width="${COVER_WIDTH}" height="${COVER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="${shadowColor}" />
      </filter>
    </defs>
    ${titleSvg}
    ${authorSvg}
  </svg>`
}

/**
 * Simple text wrapping
 */
function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]

  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)

  return lines
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Compose final cover from image asset and metadata
 *
 * This is the ONLY place where title meets image.
 * The AI model never saw this title.
 */
export async function composeCover(options: ComposeOptions): Promise<Buffer> {
  const { imageBuffer, title, author, genre = 'default', textColor: forcedTextColor } = options

  // Resize image to cover dimensions
  const resizedImage = await sharp(imageBuffer)
    .resize(COVER_WIDTH, COVER_HEIGHT, {
      fit: 'cover',
      position: 'center',
    })
    .toBuffer()

  // Determine text color
  const textColor = forcedTextColor || (await analyzeImageBrightness(resizedImage))

  // Get font style for genre
  const fontStyle = GENRE_FONTS[genre] || GENRE_FONTS.default

  // Create text overlay
  const textOverlay = createTextOverlay(title, author, fontStyle, textColor)

  // Composite image with text overlay
  const finalCover = await sharp(resizedImage)
    .composite([
      {
        input: Buffer.from(textOverlay),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer()

  return finalCover
}

/**
 * Generate cover without text (for preview/testing)
 */
export async function resizeForCover(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(COVER_WIDTH, COVER_HEIGHT, {
      fit: 'cover',
      position: 'center',
    })
    .png()
    .toBuffer()
}
