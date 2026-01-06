'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Loader2, Volume2, RotateCcw } from 'lucide-react'

interface SectionAudioPlayerProps {
  sectionId: string
  sectionTitle: string
}

type AudioStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error'

export function SectionAudioPlayer({ sectionId, sectionTitle }: SectionAudioPlayerProps) {
  const [status, setStatus] = useState<AudioStatus>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchAudio = async () => {
    setStatus('loading')
    setError(null)

    try {
      const response = await fetch(`/api/tts/section/${sectionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate audio')
      }

      if (data.status === 'generating' || data.status === 'pending') {
        // Poll for completion
        setTimeout(fetchAudio, 2000)
        return
      }

      if (data.status === 'ready' && data.audio_url) {
        setAudioUrl(data.audio_url)
        setDuration(data.duration_seconds || 0)
        setStatus('ready')
      } else {
        throw new Error('Audio not ready')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audio')
      setStatus('error')
    }
  }

  const handlePlay = () => {
    if (status === 'idle') {
      fetchAudio()
      return
    }

    if (audioRef.current) {
      if (status === 'playing') {
        audioRef.current.pause()
        setStatus('paused')
      } else {
        audioRef.current.play()
        setStatus('playing')
      }
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime)
    }
  }

  const handleEnded = () => {
    setStatus('ready')
    setProgress(0)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setProgress(time)
    }
  }

  const handleSpeedChange = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2]
    const currentIndex = speeds.indexOf(playbackRate)
    const nextIndex = (currentIndex + 1) % speeds.length
    const newRate = speeds[nextIndex]
    setPlaybackRate(newRate)
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }, [audioUrl, playbackRate])

  // Idle state - show listen button
  if (status === 'idle') {
    return (
      <button
        onClick={handlePlay}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-full transition-colors"
        title={`Listen to "${sectionTitle}"`}
      >
        <Volume2 className="w-4 h-4" />
        <span>Listen</span>
      </button>
    )
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-amber-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Generating audio...</span>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-red-600">
        <span>{error}</span>
        <button
          onClick={() => { setStatus('idle'); setError(null) }}
          className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-800"
        >
          <RotateCcw className="w-3 h-3" />
          Retry
        </button>
      </div>
    )
  }

  // Player state (ready, playing, paused)
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-amber-50 rounded-lg">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setStatus('playing')}
          onPause={() => setStatus('paused')}
        />
      )}

      {/* Play/Pause button */}
      <button
        onClick={handlePlay}
        className="flex items-center justify-center w-8 h-8 bg-amber-600 hover:bg-amber-700 text-white rounded-full transition-colors"
      >
        {status === 'playing' ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-amber-600 font-mono w-10">
          {formatTime(progress)}
        </span>
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={progress}
          onChange={handleSeek}
          className="flex-1 h-1 bg-amber-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-600 [&::-webkit-slider-thumb]:rounded-full"
        />
        <span className="text-xs text-amber-600 font-mono w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Speed control */}
      <button
        onClick={handleSpeedChange}
        className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded transition-colors"
        title="Change playback speed"
      >
        {playbackRate}x
      </button>
    </div>
  )
}
