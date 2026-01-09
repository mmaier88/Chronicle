import { createServiceClient, getUser } from '@/lib/supabase/server'
import { apiSuccess, ApiErrors } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const { user } = await getUser()
    if (!user) {
      return ApiErrors.unauthorized()
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bookId = formData.get('bookId') as string | null

    if (!file || !bookId) {
      return ApiErrors.badRequest('File and bookId are required')
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return ApiErrors.badRequest('File must be an image')
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return ApiErrors.badRequest('File must be smaller than 5MB')
    }

    const supabase = createServiceClient()

    // Verify book ownership
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, owner_id')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return ApiErrors.notFound('Book')
    }

    if (book.owner_id !== user.id) {
      return ApiErrors.forbidden()
    }

    // Convert File to ArrayBuffer then to Uint8Array
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Determine file extension from MIME type
    const extension = file.type.split('/')[1] || 'png'
    const storagePath = `${user.id}/${bookId}/cover.${extension}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(storagePath, uint8Array, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      logger.error('Cover upload failed', uploadError, { bookId, operation: 'cover_upload' })
      return ApiErrors.internal('Upload failed')
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('covers')
      .getPublicUrl(storagePath)

    const coverUrl = urlData.publicUrl

    // Update book with cover URL
    await supabase
      .from('books')
      .update({
        cover_url: coverUrl,
        cover_storage_path: storagePath,
        cover_status: 'ready',
        cover_generated_at: new Date().toISOString(),
      })
      .eq('id', bookId)

    return apiSuccess({
      status: 'ready',
      cover_url: coverUrl,
    })
  } catch (error) {
    logger.error('Cover upload error', error, { operation: 'cover_upload' })
    return ApiErrors.internal()
  }
}
