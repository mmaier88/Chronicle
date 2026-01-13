import { getUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

// Lazy-initialize ElevenLabs client
let _elevenlabs: ElevenLabsClient | null = null

function getClient(): ElevenLabsClient {
  if (!_elevenlabs) {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required')
    }
    _elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    })
  }
  return _elevenlabs
}

/**
 * GET /api/voice/signed-url
 *
 * Generates a signed URL for ElevenLabs Conversational AI.
 * Requires authenticated user.
 * Signed URLs are valid for 15 minutes.
 */
export async function GET() {
  try {
    const { user } = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agentId = process.env.ELEVENLABS_AGENT_ID

    if (!agentId) {
      console.error('[Voice] ELEVENLABS_AGENT_ID not configured')
      return NextResponse.json(
        { error: 'Voice mode not configured' },
        { status: 503 }
      )
    }

    console.log(`[Voice] Generating signed URL for user ${user.id.substring(0, 8)}, agent ${agentId}`)

    const client = getClient()

    // Generate signed URL using ElevenLabs SDK
    const response = await client.conversationalAi.conversations.getSignedUrl({
      agentId,
    })

    console.log('[Voice] Signed URL generated successfully')

    return NextResponse.json({
      signedUrl: response.signedUrl,
      expiresIn: 900, // 15 minutes in seconds
    })
  } catch (error) {
    console.error('[Voice] Failed to generate signed URL:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Voice agent not found. Please configure ELEVENLABS_AGENT_ID.' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to initialize voice conversation' },
      { status: 500 }
    )
  }
}
