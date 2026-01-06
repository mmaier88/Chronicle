import { NextResponse } from 'next/server'
import { BOOK_VOICES } from '@/lib/elevenlabs/client'

// GET: List available voices for book narration
export async function GET() {
  return NextResponse.json({
    voices: BOOK_VOICES,
    default: BOOK_VOICES[0].id,
  })
}
