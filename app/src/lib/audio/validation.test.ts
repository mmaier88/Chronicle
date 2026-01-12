import { describe, it, expect } from 'vitest'
import { validateTTSMetadata, validateAudioBlob, type TTSMetadataResponse } from './validation'

describe('validateTTSMetadata', () => {
  it('rejects null response', () => {
    const result = validateTTSMetadata(null)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('not an object')
  })

  it('rejects response without status', () => {
    const result = validateTTSMetadata({ audio_url: 'http://example.com' })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Missing status')
  })

  it('rejects invalid status', () => {
    const result = validateTTSMetadata({ status: 'invalid' })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid status')
  })

  it('rejects ready status without audio_url', () => {
    const result = validateTTSMetadata({ status: 'ready' })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('requires audio_url')
  })

  it('accepts valid ready response', () => {
    const result = validateTTSMetadata({
      status: 'ready',
      audio_url: 'https://storage.example.com/audio.mp3',
      duration_seconds: 120
    })
    expect(result.valid).toBe(true)
    expect(result.data?.status).toBe('ready')
    expect(result.data?.audio_url).toBe('https://storage.example.com/audio.mp3')
  })

  it('accepts streaming status', () => {
    const result = validateTTSMetadata({ status: 'streaming' })
    expect(result.valid).toBe(true)
    expect(result.data?.status).toBe('streaming')
  })

  it('accepts generating status', () => {
    const result = validateTTSMetadata({
      status: 'generating',
      message: 'Audio is being generated',
      retry_after: 2
    })
    expect(result.valid).toBe(true)
    expect(result.data?.status).toBe('generating')
  })

  it('accepts pending status', () => {
    const result = validateTTSMetadata({ status: 'pending' })
    expect(result.valid).toBe(true)
  })

  it('accepts error status', () => {
    const result = validateTTSMetadata({ status: 'error', message: 'Something went wrong' })
    expect(result.valid).toBe(true)
    expect(result.data?.status).toBe('error')
  })
})

describe('validateAudioBlob', () => {
  it('rejects null blob', async () => {
    const result = await validateAudioBlob(null as unknown as Blob)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('No blob')
  })

  it('rejects blob smaller than 1000 bytes', async () => {
    const smallBlob = new Blob(['small'], { type: 'audio/mpeg' })
    const result = await validateAudioBlob(smallBlob)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('too small')
  })

  // Note: The following tests require browser environment (jsdom doesn't support blob.arrayBuffer)
  // These are tested manually in the browser and work correctly there

  it.skip('accepts valid MP3 with frame sync header (browser only)', async () => {
    const mp3Header = new Uint8Array([0xFF, 0xFB, 0x90, 0x00])
    const padding = new Uint8Array(2000)
    const mp3Data = new Uint8Array(mp3Header.length + padding.length)
    mp3Data.set(mp3Header)
    mp3Data.set(padding, mp3Header.length)

    const blob = new Blob([mp3Data], { type: 'audio/mpeg' })
    const result = await validateAudioBlob(blob)
    expect(result.valid).toBe(true)
    expect(result.isMP3).toBe(true)
  })

  it.skip('accepts valid MP3 with ID3 header (browser only)', async () => {
    const id3Header = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00])
    const padding = new Uint8Array(2000)
    const mp3Data = new Uint8Array(id3Header.length + padding.length)
    mp3Data.set(id3Header)
    mp3Data.set(padding, id3Header.length)

    const blob = new Blob([mp3Data], { type: 'audio/mpeg' })
    const result = await validateAudioBlob(blob)
    expect(result.valid).toBe(true)
    expect(result.isMP3).toBe(true)
  })

  it.skip('rejects HTML content (browser only)', async () => {
    const htmlContent = '<html><body>Error</body></html>' + 'x'.repeat(2000)
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const result = await validateAudioBlob(blob)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('HTML')
  })

  it.skip('rejects JSON content (browser only)', async () => {
    const jsonContent = JSON.stringify({ error: 'Something went wrong' }) + 'x'.repeat(2000)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const result = await validateAudioBlob(blob)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('JSON')
  })

  it.skip('rejects random binary that is not MP3 (browser only)', async () => {
    const randomData = new Uint8Array(2000)
    randomData[0] = 0x00
    randomData[1] = 0x00
    const blob = new Blob([randomData], { type: 'audio/mpeg' })
    const result = await validateAudioBlob(blob)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Not valid MP3')
  })
})
