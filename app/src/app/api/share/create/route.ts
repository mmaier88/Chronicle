import { createServiceClient, getUser } from '@/lib/supabase/server'
import crypto from 'crypto'
import {
  apiSuccess,
  ApiErrors,
  validateBody,
  isApiError,
  shareCreateSchema,
} from '@/lib/api-utils'

export async function POST(request: Request) {
  try {
    const { user } = await getUser()
    if (!user) {
      return ApiErrors.unauthorized()
    }

    // Validate request body
    const validated = await validateBody(request, shareCreateSchema)
    if (isApiError(validated)) return validated

    const { bookId } = validated

    const supabase = createServiceClient()

    // Verify book ownership
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, owner_id, title')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return ApiErrors.notFound('Book')
    }

    if (book.owner_id !== user.id) {
      return ApiErrors.forbidden()
    }

    // Check for existing active share
    const { data: existingShare } = await supabase
      .from('book_shares')
      .select('id, share_token, view_count, created_at')
      .eq('book_id', bookId)
      .eq('enabled', true)
      .single()

    if (existingShare) {
      // Return existing share link
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      return apiSuccess({
        shareToken: existingShare.share_token,
        shareUrl: `${baseUrl}/share/${existingShare.share_token}`,
        viewCount: existingShare.view_count,
        createdAt: existingShare.created_at,
        isNew: false,
      })
    }

    // Generate new share token
    const shareToken = crypto.randomBytes(16).toString('hex')

    // Create share record (no expiration - shares are permanent until disabled)
    const { data: newShare, error: createError } = await supabase
      .from('book_shares')
      .insert({
        book_id: bookId,
        share_token: shareToken,
        enabled: true,
        view_count: 0,
      })
      .select('id, share_token, created_at')
      .single()

    if (createError) {
      console.error('Failed to create share:', createError)
      return ApiErrors.internal('Failed to create share link')
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return apiSuccess({
      shareToken: newShare.share_token,
      shareUrl: `${baseUrl}/share/${newShare.share_token}`,
      viewCount: 0,
      createdAt: newShare.created_at,
      isNew: true,
    })
  } catch (error) {
    console.error('Share create error:', error)
    return ApiErrors.internal()
  }
}
