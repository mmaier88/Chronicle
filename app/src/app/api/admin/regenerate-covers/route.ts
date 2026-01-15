/**
 * Admin endpoint to regenerate covers for staff picks
 * Requires CRON_SECRET for authorization
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCover } from '@/lib/cover'
import { logger } from '@/lib/logger'

const STAFF_PICK_IDS = [
  '27e441f7-eaa7-4120-8217-764fa6e3ac7e',
  'cffab58b-398f-477c-8324-0ecf20949013',
  '4a2feb17-541f-402c-bf72-8f4790617d52',
  '3edebf58-c66a-4e62-acd9-965247484df3',
]

export async function POST(request: Request) {
  // Verify admin secret
  const authHeader = request.headers.get('authorization')?.trim()
  const cronSecret = process.env.CRON_SECRET?.trim().replace(/\\n$/, '')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const results: Array<{ id: string; title: string; status: string; error?: string }> = []

  for (const bookId of STAFF_PICK_IDS) {
    try {
      // Get book data
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('id, title, genre, owner_id, constitution_json')
        .eq('id', bookId)
        .single()

      if (bookError || !book) {
        results.push({ id: bookId, title: 'Unknown', status: 'error', error: 'Book not found' })
        continue
      }

      logger.info(`Regenerating cover for: ${book.title}`, { bookId })

      // Get vibe job for summary
      const { data: vibeJob } = await supabase
        .from('vibe_jobs')
        .select('preview, prompt')
        .eq('book_id', bookId)
        .single()

      const preview = vibeJob?.preview as Record<string, unknown> | undefined
      const constitution = book.constitution_json as Record<string, unknown> | undefined

      // Build summary from multiple sources with fallbacks
      let summary = ''

      // Try vibe_jobs preview first
      if (preview?.blurb || preview?.logline) {
        summary = [
          preview?.blurb,
          preview?.logline,
          preview?.setting ? `Setting: ${preview.setting}` : null,
        ].filter(Boolean).join('\n\n')
      }
      // Fall back to constitution_json
      else if (constitution) {
        summary = [
          constitution?.logline,
          constitution?.blurb,
          constitution?.setting ? `Setting: ${constitution.setting}` : null,
          constitution?.themes ? `Themes: ${(constitution.themes as string[]).join(', ')}` : null,
        ].filter(Boolean).join('\n\n')
      }
      // Fall back to vibe_jobs prompt
      else if (vibeJob?.prompt) {
        summary = vibeJob.prompt as string
      }
      // Last resort - use title and genre
      else {
        summary = `A ${book.genre} story called "${book.title}"`
      }

      logger.info(`Using summary for cover: ${summary.substring(0, 100)}...`, { bookId })

      // Generate new cover
      const result = await generateCover({
        summary,
        genre: book.genre,
        mood: (preview?.promise as string[] | undefined)?.[0],
        title: book.title,
        author: 'Chronicle',
      })

      if (!result.success || !result.coverBuffer) {
        results.push({ id: bookId, title: book.title, status: 'error', error: result.error })
        continue
      }

      // Upload to storage (WebP for better compression)
      const storagePath = `${book.owner_id}/${bookId}/cover.webp`
      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(storagePath, result.coverBuffer, {
          contentType: 'image/webp',
          upsert: true,
        })

      if (uploadError) {
        results.push({ id: bookId, title: book.title, status: 'error', error: uploadError.message })
        continue
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(storagePath)
      const coverUrl = `${urlData.publicUrl}?t=${Date.now()}`

      // Update book
      const { error: updateError } = await supabase
        .from('books')
        .update({
          cover_url: coverUrl,
          cover_storage_path: storagePath,
          cover_status: 'ready',
          cover_generated_at: new Date().toISOString(),
        })
        .eq('id', bookId)

      if (updateError) {
        results.push({ id: bookId, title: book.title, status: 'error', error: `DB update failed: ${updateError.message}` })
        continue
      }

      results.push({ id: bookId, title: book.title, status: 'success' })
      logger.info(`Cover regenerated for: ${book.title}`, { bookId, coverUrl })
    } catch (error) {
      results.push({
        id: bookId,
        title: 'Unknown',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({ results })
}
