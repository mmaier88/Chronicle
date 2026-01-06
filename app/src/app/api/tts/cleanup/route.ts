import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// It cleans up audio files that haven't been accessed in 30 days

export async function POST(request: NextRequest) {
  // Verify cron secret (set CRON_SECRET in environment)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Get stale audio records (not accessed in 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: staleAudio, error: fetchError } = await supabase
      .from('section_audio')
      .select('id, storage_path')
      .lt('last_accessed_at', thirtyDaysAgo.toISOString())
      .eq('status', 'ready')

    if (fetchError) {
      throw new Error(`Failed to fetch stale audio: ${fetchError.message}`)
    }

    if (!staleAudio || staleAudio.length === 0) {
      return NextResponse.json({
        message: 'No stale audio to clean up',
        deleted: 0,
      })
    }

    // Delete files from storage
    const storagePaths = staleAudio.map(a => a.storage_path)
    const { error: storageError } = await supabase.storage
      .from('audio')
      .remove(storagePaths)

    if (storageError) {
      console.error('Storage deletion error:', storageError)
      // Continue to delete records even if storage deletion fails
    }

    // Delete records from database
    const ids = staleAudio.map(a => a.id)
    const { error: deleteError } = await supabase
      .from('section_audio')
      .delete()
      .in('id', ids)

    if (deleteError) {
      throw new Error(`Failed to delete audio records: ${deleteError.message}`)
    }

    return NextResponse.json({
      message: `Cleaned up ${staleAudio.length} stale audio files`,
      deleted: staleAudio.length,
      storage_paths: storagePaths,
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// GET: Check cleanup status / preview what would be deleted
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Count stale audio
  const { count, error } = await supabase
    .from('section_audio')
    .select('*', { count: 'exact', head: true })
    .lt('last_accessed_at', thirtyDaysAgo.toISOString())
    .eq('status', 'ready')

  if (error) {
    return NextResponse.json({ error: 'Failed to count stale audio' }, { status: 500 })
  }

  // Get total storage used
  const { data: allAudio } = await supabase
    .from('section_audio')
    .select('file_size_bytes')
    .eq('status', 'ready')

  const totalBytes = allAudio?.reduce((sum, a) => sum + (a.file_size_bytes || 0), 0) || 0

  return NextResponse.json({
    stale_count: count || 0,
    total_audio_files: allAudio?.length || 0,
    total_storage_bytes: totalBytes,
    total_storage_mb: Math.round(totalBytes / 1024 / 1024 * 100) / 100,
    cleanup_threshold: '30 days',
  })
}
