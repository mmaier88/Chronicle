'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useConversation } from '@elevenlabs/react'
import { Mic, MicOff, Loader2, Volume2, ArrowLeft, AlertCircle } from 'lucide-react'
import { BookGenre, StorySliders, DEFAULT_SLIDERS, SliderValue } from '@/types/chronicle'
import { api } from '@/lib/api-client'
import Link from 'next/link'

// Only show on staging
const VOICE_MODE_ENABLED = process.env.NEXT_PUBLIC_VOICE_MODE_ENABLED === 'true'

type ConversationStatus = 'idle' | 'requesting-mic' | 'connecting' | 'connected' | 'processing' | 'error'

interface CreateStoryParams {
  prompt: string
  length?: number
  tone?: string
  violence?: string
  romance?: string
}

// Map voice agent preference strings to slider values
function mapPreferenceToSlider(value: string | undefined): SliderValue {
  if (!value || value === 'auto') return 'auto'
  const map: Record<string, SliderValue> = {
    'minimal': 1,
    'low': 2,
    'balanced': 3,
    'moderate': 3,
    'high': 4,
    'extreme': 5,
    'hopeful': 1,
    'bittersweet': 3,
    'tragic': 5,
  }
  return map[value.toLowerCase()] || 'auto'
}

export default function VoiceCreatePage() {
  const router = useRouter()
  const [status, setStatus] = useState<ConversationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string[]>([])
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false)
  const processingRef = useRef(false)

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('[Voice] Connected to agent')
      setStatus('connected')
      setError(null)
    },
    onDisconnect: () => {
      console.log('[Voice] Disconnected from agent')
      if (status !== 'processing') {
        setStatus('idle')
      }
    },
    onError: (error) => {
      console.error('[Voice] Conversation error:', error)
      setError('Connection lost. Please try again.')
      setStatus('error')
    },
    onMessage: (message) => {
      console.log('[Voice] Message:', message)
      // Add to transcript for visual feedback
      if (message.message) {
        setTranscript(prev => [...prev, message.message])
      }
    },
    onModeChange: (mode) => {
      console.log('[Voice] Mode changed:', mode)
      setIsAgentSpeaking(mode.mode === 'speaking')
    },
    clientTools: {
      // This tool is called by the agent when user confirms their story
      createStoryPreview: async (params: CreateStoryParams) => {
        console.log('[Voice] createStoryPreview called with:', params)

        if (processingRef.current) {
          return 'Already processing your story. Please wait.'
        }
        processingRef.current = true

        try {
          setStatus('processing')

          // Build sliders from agent preferences
          const sliders: StorySliders = {
            ...DEFAULT_SLIDERS,
            tone: mapPreferenceToSlider(params.tone),
            violence: mapPreferenceToSlider(params.violence),
            romance: mapPreferenceToSlider(params.romance),
          }

          // Call our preview API
          const { data, error: apiError } = await api.create.preview({
            genre: 'literary_fiction' as BookGenre,
            prompt: params.prompt,
          })

          if (apiError || !data) {
            throw new Error(apiError || 'Failed to generate preview')
          }

          // Store in localStorage (same format as /create/new)
          localStorage.setItem('vibe_draft', JSON.stringify({
            genre: 'literary_fiction',
            prompt: params.prompt,
            preview: data.preview,
            length: params.length || 30,
            sliders,
          }))

          // End conversation gracefully
          await conversation.endSession()

          // Redirect to preview page
          router.push('/create/preview')

          return 'Perfect! I\'ve captured your story idea. Redirecting you to preview your book...'
        } catch (err) {
          console.error('[Voice] Failed to create preview:', err)
          processingRef.current = false
          setStatus('connected')
          return `I had trouble creating your preview. Let's try again - could you describe your story one more time?`
        }
      },
    },
  })

  // Start conversation
  const startConversation = useCallback(async () => {
    setError(null)
    setTranscript([])

    try {
      // Request microphone permission
      setStatus('requesting-mic')
      await navigator.mediaDevices.getUserMedia({ audio: true })

      // Get signed URL from our API
      setStatus('connecting')
      const response = await fetch('/api/voice/signed-url')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize voice mode')
      }

      // Start ElevenLabs conversation
      await conversation.startSession({
        signedUrl: data.signedUrl,
      })
    } catch (err) {
      console.error('[Voice] Failed to start conversation:', err)

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
          setError('Microphone access is required for voice mode. Please allow microphone access and try again.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Failed to start voice conversation')
      }

      setStatus('error')
    }
  }, [conversation])

  // End conversation
  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession()
    } catch (err) {
      console.error('[Voice] Failed to end conversation:', err)
    }
    setStatus('idle')
    setTranscript([])
  }, [conversation])

  // If voice mode is not enabled, show message
  if (!VOICE_MODE_ENABLED) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
        <h1 className="app-heading-1" style={{ marginBottom: '1rem' }}>
          Voice Mode Coming Soon
        </h1>
        <p className="app-body" style={{ opacity: 0.7, marginBottom: '2rem' }}>
          Voice-based story creation is currently in development.
        </p>
        <Link href="/create/new" className="app-button-primary">
          Use Text Input Instead
        </Link>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
    }}>
      {/* Back button */}
      <Link
        href="/create/new"
        className="app-nav-link"
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Text input
      </Link>

      {/* Main content */}
      <div style={{ maxWidth: 400 }}>
        {/* Status indicator / Voice orb */}
        <div style={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          margin: '0 auto 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: status === 'connected'
            ? isAgentSpeaking
              ? 'radial-gradient(circle, rgba(212, 165, 116, 0.3) 0%, rgba(212, 165, 116, 0.1) 50%, transparent 70%)'
              : 'radial-gradient(circle, rgba(212, 165, 116, 0.2) 0%, rgba(212, 165, 116, 0.05) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(26, 39, 68, 0.5) 0%, transparent 70%)',
          transition: 'all 0.3s ease',
          animation: status === 'connected' && isAgentSpeaking ? 'pulse 2s ease-in-out infinite' : 'none',
        }}>
          {status === 'idle' && (
            <Mic style={{ width: 48, height: 48, color: 'var(--moon-soft)', opacity: 0.5 }} />
          )}
          {status === 'requesting-mic' && (
            <Mic style={{ width: 48, height: 48, color: 'var(--amber-warm)', animation: 'pulse 1s ease-in-out infinite' }} />
          )}
          {status === 'connecting' && (
            <Loader2 style={{ width: 48, height: 48, color: 'var(--amber-warm)', animation: 'spin 1s linear infinite' }} />
          )}
          {status === 'connected' && !isAgentSpeaking && (
            <Mic style={{ width: 48, height: 48, color: 'var(--amber-warm)' }} />
          )}
          {status === 'connected' && isAgentSpeaking && (
            <Volume2 style={{ width: 48, height: 48, color: 'var(--amber-warm)' }} />
          )}
          {status === 'processing' && (
            <Loader2 style={{ width: 48, height: 48, color: 'var(--amber-warm)', animation: 'spin 1s linear infinite' }} />
          )}
          {status === 'error' && (
            <AlertCircle style={{ width: 48, height: 48, color: '#f43f5e' }} />
          )}
        </div>

        {/* Status text */}
        <h1 className="app-heading-2" style={{ marginBottom: '0.75rem' }}>
          {status === 'idle' && 'Speak Your Story'}
          {status === 'requesting-mic' && 'Requesting Microphone...'}
          {status === 'connecting' && 'Connecting...'}
          {status === 'connected' && !isAgentSpeaking && "I'm listening..."}
          {status === 'connected' && isAgentSpeaking && 'Speaking...'}
          {status === 'processing' && 'Creating your preview...'}
          {status === 'error' && 'Something went wrong'}
        </h1>

        <p className="app-body" style={{ opacity: 0.7, marginBottom: '2rem' }}>
          {status === 'idle' && 'Have a conversation about the story you want to read.'}
          {status === 'requesting-mic' && 'Please allow microphone access to continue.'}
          {status === 'connecting' && 'Setting up your story guide...'}
          {status === 'connected' && !isAgentSpeaking && 'Tell me about the story you want.'}
          {status === 'connected' && isAgentSpeaking && ''}
          {status === 'processing' && "We'll have your preview ready in a moment."}
          {status === 'error' && error}
        </p>

        {/* Transcript */}
        {transcript.length > 0 && status === 'connected' && (
          <div style={{
            maxHeight: 120,
            overflow: 'auto',
            marginBottom: '2rem',
            padding: '1rem',
            background: 'rgba(26, 39, 68, 0.3)',
            borderRadius: 12,
            textAlign: 'left',
          }}>
            {transcript.slice(-3).map((msg, i) => (
              <p key={i} className="app-body-sm" style={{ opacity: 0.8, marginBottom: i < transcript.length - 1 ? '0.5rem' : 0 }}>
                {msg}
              </p>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {status === 'idle' && (
          <button
            onClick={startConversation}
            className="app-button-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Mic style={{ width: 20, height: 20 }} />
            Start Talking
          </button>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={startConversation}
              className="app-button-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Try Again
            </button>
            <Link
              href="/create/new"
              className="app-button-secondary"
              style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
            >
              Use Text Instead
            </Link>
          </div>
        )}

        {status === 'connected' && (
          <button
            onClick={endConversation}
            className="app-button-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <MicOff style={{ width: 18, height: 18 }} />
            End Conversation
          </button>
        )}

        {(status === 'requesting-mic' || status === 'connecting' || status === 'processing') && (
          <button
            disabled
            className="app-button-secondary"
            style={{ width: '100%', justifyContent: 'center', opacity: 0.5, cursor: 'not-allowed' }}
          >
            <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
            {status === 'processing' ? 'Processing...' : 'Please wait...'}
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
