import { createServiceClient, getUser } from '@/lib/supabase/server'
import { apiSuccess, ApiErrors } from '@/lib/api-utils'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const { user } = await getUser()

    if (!user) {
      return ApiErrors.unauthorized()
    }

    const supabase = createServiceClient()

    const { data: book, error } = await supabase
      .from('books')
      .select('id, owner_id, cover_url, cover_status, cover_generated_at')
      .eq('id', bookId)
      .single()

    if (error || !book) {
      return ApiErrors.notFound('Book')
    }

    // Verify ownership
    if (book.owner_id !== user.id) {
      return ApiErrors.forbidden()
    }

    return apiSuccess({
      status: book.cover_status || 'pending',
      cover_url: book.cover_url,
      generated_at: book.cover_generated_at,
    })
  } catch {
    return ApiErrors.internal()
  }
}
