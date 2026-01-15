/**
 * Typography Settings API
 *
 * GET - Load user's typography preferences
 * POST - Save typography preferences (synced across all books)
 */

import { NextRequest } from 'next/server'
import { getUser, createServiceClient } from '@/lib/supabase/server'
import { success, apiError } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { DEFAULT_TYPOGRAPHY, ReaderTheme, ReaderFont, ReaderMargins } from '@/lib/reader'

// GET /api/reader/typography
export async function GET() {
  const { user } = await getUser()
  if (!user) {
    return apiError.unauthorized()
  }

  const supabase = createServiceClient()

  // Get typography settings
  const { data: settings, error } = await supabase
    .from('typography_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    logger.error('Failed to load typography settings', error, { userId: user.id })
    return apiError.internal('Failed to load typography settings')
  }

  // Return settings or defaults (handle missing new fields for existing users)
  return success({
    settings: {
      user_id: user.id,
      ...DEFAULT_TYPOGRAPHY,
      ...settings,
    },
  })
}

// POST /api/reader/typography
export async function POST(request: NextRequest) {
  const { user } = await getUser()
  if (!user) {
    return apiError.unauthorized()
  }

  let body: {
    fontSize?: number
    lineHeight?: number
    fontFamily?: ReaderFont
    theme?: ReaderTheme
    margins?: ReaderMargins
    justify?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return apiError.badRequest('Invalid request body')
  }

  const {
    fontSize,
    lineHeight,
    fontFamily,
    theme,
    margins,
    justify,
  } = body

  // Validate only provided fields
  if (fontSize !== undefined && (fontSize < 12 || fontSize > 32)) {
    return apiError.badRequest('fontSize must be between 12 and 32')
  }
  if (lineHeight !== undefined && (lineHeight < 1.0 || lineHeight > 2.5)) {
    return apiError.badRequest('lineHeight must be between 1.0 and 2.5')
  }
  if (fontFamily !== undefined && !['serif', 'sans'].includes(fontFamily)) {
    return apiError.badRequest('fontFamily must be "serif" or "sans"')
  }
  if (theme !== undefined && !['light', 'dark', 'sepia', 'midnight'].includes(theme)) {
    return apiError.badRequest('theme must be "light", "dark", "sepia", or "midnight"')
  }
  if (margins !== undefined && !['narrow', 'normal', 'wide'].includes(margins)) {
    return apiError.badRequest('margins must be "narrow", "normal", or "wide"')
  }
  if (justify !== undefined && typeof justify !== 'boolean') {
    return apiError.badRequest('justify must be a boolean')
  }

  const supabase = createServiceClient()

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }
  if (fontSize !== undefined) updateData.font_size = fontSize
  if (lineHeight !== undefined) updateData.line_height = lineHeight
  if (fontFamily !== undefined) updateData.font_family = fontFamily
  if (theme !== undefined) updateData.theme = theme
  if (margins !== undefined) updateData.margins = margins
  if (justify !== undefined) updateData.justify = justify

  // Upsert typography settings directly
  const { data: settings, error } = await supabase
    .from('typography_settings')
    .upsert(updateData, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    logger.error('Failed to save typography settings', error, { userId: user.id })
    return apiError.internal('Failed to save typography settings')
  }

  return success({
    settings,
    saved: true,
  })
}
