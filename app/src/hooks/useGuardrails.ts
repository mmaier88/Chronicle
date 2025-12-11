'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface GuardrailWarning {
  type: 'unsupported_claim' | 'hallucination' | 'speculation' | 'outdated_reference' | 'bias' | 'jargon'
  severity: 'low' | 'medium' | 'high'
  start_offset: number
  end_offset: number
  text: string
  message: string
  suggestion?: string
}

export interface GuardrailSuggestion {
  type: 'add_citation' | 'strengthen_argument' | 'clarify' | 'simplify'
  start_offset: number
  end_offset: number
  text: string
  message: string
  action?: string
}

export interface GuardrailMetrics {
  readability_score: number
  confidence_score: number
  citation_coverage: number
}

export interface CitationSuggestion {
  claim_text: string
  start_offset: number
  end_offset: number
  reason: string
  suggested_search_terms: string[]
  matching_sources?: Array<{
    id: string
    title: string
    relevance: number
  }>
}

export interface WritingIssue {
  type: 'readability' | 'tone' | 'jargon' | 'passive_voice' | 'complex_sentence' | 'redundancy'
  severity: 'low' | 'medium' | 'high'
  start_offset: number
  end_offset: number
  original_text: string
  message: string
  suggestion?: string
  replacement?: string
}

export interface GuardrailSettings {
  enabled: boolean
  sensitivity: 'strict' | 'medium' | 'relaxed'
  checks: string[]
  autoAnalyzeDelay: number // ms
  showInlineWarnings: boolean
  showSuggestions: boolean
}

const DEFAULT_SETTINGS: GuardrailSettings = {
  enabled: true,
  sensitivity: 'medium',
  checks: ['claims', 'speculation', 'citations', 'readability'],
  autoAnalyzeDelay: 3000, // 3 seconds after typing stops
  showInlineWarnings: true,
  showSuggestions: true,
}

export function useGuardrails(documentId?: string, projectId?: string) {
  const [settings, setSettings] = useState<GuardrailSettings>(DEFAULT_SETTINGS)
  const [warnings, setWarnings] = useState<GuardrailWarning[]>([])
  const [suggestions, setSuggestions] = useState<GuardrailSuggestion[]>([])
  const [citationSuggestions, setCitationSuggestions] = useState<CitationSuggestion[]>([])
  const [writingIssues, setWritingIssues] = useState<WritingIssue[]>([])
  const [metrics, setMetrics] = useState<GuardrailMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const lastAnalyzedText = useRef<string>('')

  // Analyze text for warnings and suggestions
  const analyze = useCallback(async (text: string) => {
    if (!settings.enabled || !text.trim()) {
      setWarnings([])
      setSuggestions([])
      setMetrics(null)
      return
    }

    // Skip if text hasn't changed significantly
    if (text === lastAnalyzedText.current) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/guardrails/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          document_id: documentId,
          sensitivity: settings.sensitivity,
          checks: settings.checks,
        }),
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const data = await response.json()
      setWarnings(data.warnings || [])
      setSuggestions(data.suggestions || [])
      setMetrics(data.metrics || null)
      lastAnalyzedText.current = text
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [settings, documentId])

  // Debounced analysis on text change
  const analyzeDebounced = useCallback((text: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      analyze(text)
    }, settings.autoAnalyzeDelay)
  }, [analyze, settings.autoAnalyzeDelay])

  // Get citation suggestions
  const suggestCitations = useCallback(async (text: string) => {
    if (!text.trim()) {
      setCitationSuggestions([])
      return
    }

    try {
      const response = await fetch('/api/guardrails/suggest-citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          project_id: projectId,
          include_source_search: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Citation suggestion failed')
      }

      const data = await response.json()
      setCitationSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('Citation suggestion error:', err)
    }
  }, [projectId])

  // Analyze writing quality
  const analyzeWriting = useCallback(async (text: string, targetAudience = 'academic') => {
    if (!text.trim()) {
      setWritingIssues([])
      return
    }

    try {
      const response = await fetch('/api/guardrails/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          target_audience: targetAudience,
          checks: ['readability', 'tone', 'jargon', 'passive_voice', 'complexity'],
        }),
      })

      if (!response.ok) {
        throw new Error('Writing analysis failed')
      }

      const data = await response.json()
      setWritingIssues(data.issues || [])
      return data
    } catch (err) {
      console.error('Writing analysis error:', err)
      return null
    }
  }, [])

  // Simplify text
  const simplifyText = useCallback(async (text: string, targetLevel = 'general') => {
    try {
      const response = await fetch('/api/guardrails/writing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          target_level: targetLevel,
        }),
      })

      if (!response.ok) {
        throw new Error('Simplification failed')
      }

      return await response.json()
    } catch (err) {
      console.error('Simplification error:', err)
      return null
    }
  }, [])

  // Fact-check text
  const factCheck = useCallback(async (text: string, claims?: string[]) => {
    try {
      const response = await fetch('/api/guardrails/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          claims,
          project_id: projectId,
        }),
      })

      if (!response.ok) {
        throw new Error('Fact-check failed')
      }

      return await response.json()
    } catch (err) {
      console.error('Fact-check error:', err)
      return null
    }
  }, [projectId])

  // Dismiss a warning
  const dismissWarning = useCallback((index: number) => {
    setWarnings(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Dismiss a suggestion
  const dismissSuggestion = useCallback((index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<GuardrailSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  // Clear all
  const clearAll = useCallback(() => {
    setWarnings([])
    setSuggestions([])
    setCitationSuggestions([])
    setWritingIssues([])
    setMetrics(null)
    setError(null)
    lastAnalyzedText.current = ''
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  return {
    // State
    settings,
    warnings,
    suggestions,
    citationSuggestions,
    writingIssues,
    metrics,
    loading,
    error,

    // Actions
    analyze,
    analyzeDebounced,
    suggestCitations,
    analyzeWriting,
    simplifyText,
    factCheck,
    dismissWarning,
    dismissSuggestion,
    updateSettings,
    clearAll,

    // Computed
    warningCount: warnings.length,
    suggestionCount: suggestions.length,
    hasIssues: warnings.length > 0 || suggestions.length > 0,
    highSeverityCount: warnings.filter(w => w.severity === 'high').length,
  }
}
