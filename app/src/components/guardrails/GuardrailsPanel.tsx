'use client'

import { useState } from 'react'
import {
  useGuardrails,
  GuardrailWarning,
  GuardrailSuggestion,
  GuardrailSettings,
} from '@/hooks/useGuardrails'

interface GuardrailsPanelProps {
  text: string
  documentId?: string
  projectId?: string
  onSelectRange?: (start: number, end: number) => void
}

export function GuardrailsPanel({
  text,
  documentId,
  projectId,
  onSelectRange,
}: GuardrailsPanelProps) {
  const {
    settings,
    warnings,
    suggestions,
    metrics,
    loading,
    error,
    analyze,
    suggestCitations,
    factCheck,
    dismissWarning,
    dismissSuggestion,
    updateSettings,
    warningCount,
    suggestionCount,
  } = useGuardrails(documentId, projectId)

  const [activeTab, setActiveTab] = useState<'warnings' | 'suggestions' | 'metrics' | 'settings'>('warnings')
  const [factCheckResults, setFactCheckResults] = useState<{
    results: Array<{
      claim: string
      verdict: string
      confidence: number
      explanation: string
    }>
    summary: {
      total: number
      supported: number
      unsupported: number
    }
  } | null>(null)

  const handleAnalyze = () => {
    analyze(text)
  }

  const handleFactCheck = async () => {
    const results = await factCheck(text)
    if (results) {
      setFactCheckResults(results)
    }
  }

  const handleWarningClick = (warning: GuardrailWarning) => {
    if (onSelectRange && warning.start_offset > 0) {
      onSelectRange(warning.start_offset, warning.end_offset)
    }
  }

  const handleSuggestionClick = (suggestion: GuardrailSuggestion) => {
    if (onSelectRange && suggestion.start_offset > 0) {
      onSelectRange(suggestion.start_offset, suggestion.end_offset)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20'
      case 'low': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20'
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20'
    }
  }

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'supported': return 'text-green-600'
      case 'unsupported': return 'text-red-600'
      case 'partially_supported': return 'text-yellow-600'
      case 'needs_verification': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">AI Guardrails</h3>
          <button
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 text-sm">
          <span className={warningCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}>
            {warningCount} warnings
          </span>
          <span className={suggestionCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}>
            {suggestionCount} suggestions
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['warnings', 'suggestions', 'metrics', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">
            {error}
          </div>
        )}

        {/* Warnings Tab */}
        {activeTab === 'warnings' && (
          <div className="space-y-3">
            {warnings.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                No warnings found. Click Analyze to check your text.
              </p>
            ) : (
              warnings.map((warning, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg cursor-pointer ${getSeverityColor(warning.severity)}`}
                  onClick={() => handleWarningClick(warning)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-medium uppercase">{warning.type.replace(/_/g, ' ')}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        dismissWarning(index)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm font-medium mb-1">&ldquo;{warning.text.slice(0, 100)}{warning.text.length > 100 ? '...' : ''}&rdquo;</p>
                  <p className="text-sm opacity-80">{warning.message}</p>
                  {warning.suggestion && (
                    <p className="text-xs mt-2 opacity-70">Suggestion: {warning.suggestion}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="space-y-3">
            <button
              onClick={() => suggestCitations(text)}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 mb-4"
            >
              Find Citation Opportunities
            </button>

            {suggestions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                No suggestions yet.
              </p>
            ) : (
              suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 cursor-pointer"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">
                      {suggestion.type.replace(/_/g, ' ')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        dismissSuggestion(index)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion.message}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            <button
              onClick={handleFactCheck}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Run Fact Check
            </button>

            {metrics && (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Readability</span>
                    <span className="text-sm font-medium">{metrics.readability_score}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${metrics.readability_score}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Confidence</span>
                    <span className="text-sm font-medium">{metrics.confidence_score}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${metrics.confidence_score}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Citation Coverage</span>
                    <span className="text-sm font-medium">{metrics.citation_coverage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${metrics.citation_coverage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {factCheckResults && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Fact Check Results</h4>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded mb-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="font-bold text-green-600">{factCheckResults.summary.supported}</div>
                      <div className="text-gray-500 text-xs">Supported</div>
                    </div>
                    <div>
                      <div className="font-bold text-red-600">{factCheckResults.summary.unsupported}</div>
                      <div className="text-gray-500 text-xs">Unsupported</div>
                    </div>
                    <div>
                      <div className="font-bold text-gray-600">{factCheckResults.summary.total}</div>
                      <div className="text-gray-500 text-xs">Total</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {factCheckResults.results.map((result, i) => (
                    <div key={i} className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                      <p className="font-medium">&ldquo;{result.claim.slice(0, 80)}...&rdquo;</p>
                      <p className={`text-xs ${getVerdictColor(result.verdict)}`}>
                        {result.verdict} ({Math.round(result.confidence * 100)}% confidence)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => updateSettings({ enabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Enable Guardrails</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sensitivity
              </label>
              <select
                value={settings.sensitivity}
                onChange={(e) => updateSettings({ sensitivity: e.target.value as GuardrailSettings['sensitivity'] })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm"
              >
                <option value="strict">Strict - Flag everything</option>
                <option value="medium">Medium - Balanced</option>
                <option value="relaxed">Relaxed - Major issues only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Active Checks
              </label>
              <div className="space-y-2">
                {['claims', 'speculation', 'citations', 'readability', 'bias'].map((check) => (
                  <label key={check} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.checks.includes(check)}
                      onChange={(e) => {
                        const newChecks = e.target.checked
                          ? [...settings.checks, check]
                          : settings.checks.filter(c => c !== check)
                        updateSettings({ checks: newChecks })
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{check}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showInlineWarnings}
                  onChange={(e) => updateSettings({ showInlineWarnings: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show inline warnings</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
