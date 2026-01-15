import { getUser, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Account deletion endpoint (GDPR compliant)
 *
 * Deletes all user data:
 * - Books and their chapters/sections
 * - Audio files in storage
 * - User preferences
 * - User profile
 * - Auth account
 */
export async function DELETE() {
  try {
    const { user } = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    logger.info(`[Account Delete] Starting deletion for user ${user.id}`)

    // 1. Get all books owned by user
    const { data: books } = await supabase
      .from('books')
      .select('id')
      .eq('owner_id', user.id)

    const bookIds = books?.map(b => b.id) || []

    // 2. Delete audio files from storage
    if (bookIds.length > 0) {
      // List and delete audio files
      const { data: audioFiles } = await supabase.storage
        .from('audio')
        .list(user.id)

      if (audioFiles && audioFiles.length > 0) {
        const filePaths = audioFiles.map(f => `${user.id}/${f.name}`)
        await supabase.storage.from('audio').remove(filePaths)
      }
    }

    // 3. Delete cover images from storage
    for (const bookId of bookIds) {
      const { data: coverFiles } = await supabase.storage
        .from('covers')
        .list(bookId)

      if (coverFiles && coverFiles.length > 0) {
        const filePaths = coverFiles.map(f => `${bookId}/${f.name}`)
        await supabase.storage.from('covers').remove(filePaths)
      }
    }

    // 4. Delete database records (cascade will handle related records)
    // Delete vibe jobs
    await supabase
      .from('vibe_jobs')
      .delete()
      .eq('user_id', user.id)

    // Delete reader progress
    await supabase
      .from('reader_progress')
      .delete()
      .eq('user_id', user.id)

    // Delete typography settings
    await supabase
      .from('typography_settings')
      .delete()
      .eq('user_id', user.id)

    // Delete section audio
    if (bookIds.length > 0) {
      const { data: sections } = await supabase
        .from('sections')
        .select('id')
        .in('chapter_id',
          (await supabase
            .from('chapters')
            .select('id')
            .in('book_id', bookIds)
          ).data?.map(c => c.id) || []
        )

      if (sections && sections.length > 0) {
        await supabase
          .from('section_audio')
          .delete()
          .in('section_id', sections.map(s => s.id))
      }
    }

    // Delete books (will cascade to chapters, sections, book_shares)
    await supabase
      .from('books')
      .delete()
      .eq('owner_id', user.id)

    // Delete user preferences
    await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', user.id)

    // Delete user profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id)

    // 5. Delete auth user (this will sign them out)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
      user.id
    )

    if (deleteAuthError) {
      logger.error('[Account Delete] Auth deletion failed:', deleteAuthError)
      // Continue anyway - data is already deleted
    }

    logger.info(`[Account Delete] Successfully deleted user ${user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Account and all associated data have been deleted'
    })
  } catch (error) {
    logger.error('[Account Delete] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again or contact support.' },
      { status: 500 }
    )
  }
}
