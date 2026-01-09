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
import { DEFAULT_TYPOGRAPHY, ReaderTheme, ReaderFont } from '@/lib/reader'

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

  // Return settings or defaults
  return success({
    settings: settings || {
      user_id: user.id,
      ...DEFAULT_TYPOGRAPHY,
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
  }

  try {
    body = await request.json()
  } catch {
    return apiError.badRequest('Invalid request body')
  }

  const {
    fontSize = DEFAULT_TYPOGRAPHY.font_size,
    lineHeight = DEFAULT_TYPOGRAPHY.line_height,
    fontFamily = DEFAULT_TYPOGRAPHY.font_family,
    theme = DEFAULT_TYPOGRAPHY.theme,
  } = body

  // Validate
  if (fontSize < 12 || fontSize > 32) {
    return apiError.badRequest('fontSize must be between 12 and 32')
  }
  if (lineHeight < 1.0 || lineHeight > 2.5) {
    return apiError.badRequest('lineHeight must be between 1.0 and 2.5')
  }
  if (!['serif', 'sans'].includes(fontFamily)) {
    return apiError.badRequest('fontFamily must be "serif" or "sans"')
  }
  if (!['light', 'dark', 'warm-night'].includes(theme)) {
    return apiError.badRequest('theme must be "light", "dark", or "warm-night"')
  }

  const supabase = createServiceClient()

  // Upsert typography settings
  const { data: settings, error } = await supabase.rpc('upsert_typography_settings', {
    p_user_id: user.id,
    p_font_size: fontSize,
    p_line_height: lineHeight,
    p_font_family: fontFamily,
    p_theme: theme,
  })

  if (error) {
    logger.error('Failed to save typography settings', error, { userId: user.id })
    return apiError.internal('Failed to save typography settings')
  }

  return success({
    settings,
    saved: true,
  })
}
