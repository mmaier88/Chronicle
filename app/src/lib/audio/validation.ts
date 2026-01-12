/**
 * Audio validation utilities for TTS responses
 * Used in both production and tests to ensure audio data is valid
 */

export interface TTSMetadataResponse {
  status: 'ready' | 'streaming' | 'generating' | 'pending' | 'error'
  audio_url?: string
  stream_url?: string
  duration_seconds?: number
  message?: string
  retry_after?: number
}

export interface AudioValidationResult {
  valid: boolean
  error?: string
  isMP3?: boolean
  size?: number
}

/**
 * Validate TTS metadata response from /api/tts/section endpoint
 */
export function validateTTSMetadata(data: unknown): { valid: boolean; error?: string; data?: TTSMetadataResponse } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Response is not an object' }
  }

  const response = data as Record<string, unknown>

  if (!response.status) {
    return { valid: false, error: 'Missing status field' }
  }

  const validStatuses = ['ready', 'streaming', 'generating', 'pending', 'error']
  if (!validStatuses.includes(response.status as string)) {
    return { valid: false, error: `Invalid status: ${response.status}` }
  }

  // For ready status, audio_url is required
  if (response.status === 'ready' && !response.audio_url) {
    return { valid: false, error: 'Ready status requires audio_url' }
  }

  // For streaming status, we should proceed to fetch
  if (response.status === 'streaming') {
    // Valid - client should fetch from simple endpoint
  }

  return {
    valid: true,
    data: response as TTSMetadataResponse
  }
}

/**
 * Check if a blob appears to be valid MP3 audio
 * MP3 files start with either:
 * - FF FB (MP3 frame sync)
 * - FF FA (MP3 frame sync)
 * - FF F3 (MP3 frame sync)
 * - 49 44 33 (ID3 tag header)
 */
export async function validateAudioBlob(blob: Blob): Promise<AudioValidationResult> {
  if (!blob) {
    return { valid: false, error: 'No blob provided' }
  }

  if (blob.size < 1000) {
    return { valid: false, error: `Blob too small: ${blob.size} bytes`, size: blob.size }
  }

  try {
    // Use arrayBuffer on the full blob (more compatible with jsdom)
    const buffer = await blob.arrayBuffer()
    const byteArray = new Uint8Array(buffer)

    // Check for MP3 frame sync (FF Fx or FF Ex)
    const isFrameSync = byteArray[0] === 0xFF && (byteArray[1] & 0xE0) === 0xE0

    // Check for ID3 tag (49 44 33 = "ID3")
    const isID3 = byteArray[0] === 0x49 && byteArray[1] === 0x44 && byteArray[2] === 0x33

    const isMP3 = isFrameSync || isID3

    if (!isMP3) {
      // Check if it's HTML (error page)
      if (byteArray[0] === 0x3C) { // '<'
        const decoder = new TextDecoder()
        const text = decoder.decode(byteArray.slice(0, 500))
        return { valid: false, error: `Received HTML instead of audio: ${text.substring(0, 100)}`, size: blob.size }
      }

      // Check if it's JSON (error response)
      if (byteArray[0] === 0x7B) { // '{'
        const decoder = new TextDecoder()
        const text = decoder.decode(byteArray)
        return { valid: false, error: `Received JSON instead of audio: ${text.substring(0, 200)}`, size: blob.size }
      }

      const bytesHex = Array.from(byteArray.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')
      return { valid: false, error: `Not valid MP3 format. First bytes: ${bytesHex}`, size: blob.size, isMP3: false }
    }

    return { valid: true, isMP3: true, size: blob.size }
  } catch (err) {
    return { valid: false, error: `Validation error: ${err instanceof Error ? err.message : 'Unknown'}` }
  }
}

/**
 * Validate audio URL can be fetched and contains valid audio
 */
export async function validateAudioUrl(url: string): Promise<AudioValidationResult> {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      return { valid: false, error: `Fetch failed: ${response.status} ${response.statusText}` }
    }

    const contentType = response.headers.get('content-type') || ''

    // If response is JSON, it's an error
    if (contentType.includes('application/json')) {
      const data = await response.json()
      return { valid: false, error: `Got JSON response: ${JSON.stringify(data).substring(0, 200)}` }
    }

    const blob = await response.blob()
    return validateAudioBlob(blob)
  } catch (err) {
    return { valid: false, error: `Network error: ${err instanceof Error ? err.message : 'Unknown'}` }
  }
}
