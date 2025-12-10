'use client'

import { useState } from 'react'

interface SafetyIssue {
  type: 'unsupported_claim' | 'outdated_reference' | 'unverifiable' | 'speculation' | 'overgeneralization' | 'missing_context'
  severity: 'high' | 'medium' | 'low'
  text: string
  suggestion: string
}

interface SafetyAssessment {
  overallScore: number
  riskLevel: 'low' | 'moderate' | 'high' | 'critical'
  issues: SafetyIssue[]
  summary: string
  recommendations: string[]
  stats: {
    totalClaims: number
    supportedClaims: number
    unsupportedClaims: number
    speculativeClaims: number
    citationsCoverage: number
  }
}

interface SafetyPanelProps {
  documentContent: string
  documentId?: string
  projectId?: string
  isOpen: boolean
  onClose: () => void
}

export function SafetyPanel({ documentContent, documentId, projectId, isOpen, onClose }: SafetyPanelProps) {
  const [assessment, setAssessment] = useState<SafetyAssessment | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null)

  const runAssessment = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/safety/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: documentContent,
          documentId,
          projectId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Assessment failed')
      }

      setAssessment(data.assessment)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assessment failed')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    if (score >= 30) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-500'
    if (score >= 70) return 'bg-blue-500'
    if (score >= 50) return 'bg-yellow-500'
    if (score >= 30) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'moderate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return '🔴'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'unsupported_claim': return '❓'
      case 'outdated_reference': return '📅'
      case 'unverifiable': return '🔍'
      case 'speculation': return '💭'
      case 'overgeneralization': return '🌐'
      case 'missing_context': return '📋'
      default: return '⚠️'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'unsupported_claim': return 'Unsupported Claim'
      case 'outdated_reference': return 'Outdated Reference'
      case 'unverifiable': return 'Unverifiable'
      case 'speculation': return 'Speculation'
      case 'overgeneralization': return 'Overgeneralization'
      case 'missing_context': return 'Missing Context'
      default: return type
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h2 className="font-semibold text-gray-900 dark:text-white">Safety Assessment</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Action Bar */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={runAssessment}
          disabled={loading}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Run Safety Assessment
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}

        {!assessment && !loading && !error && (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Assess your document for reliability issues
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              AI analyzes claims, evidence, and potential hallucinations
            </p>
          </div>
        )}

        {assessment && (
          <div className="space-y-4">
            {/* Score Card */}
            <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`text-4xl font-bold ${getScoreColor(assessment.overallScore)}`}>
                    {assessment.overallScore}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Safety Score
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${getRiskBadge(assessment.riskLevel)}`}>
                      {assessment.riskLevel.toUpperCase()} RISK
                    </span>
                  </div>
                </div>
              </div>
              {/* Score Bar */}
              <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getScoreBg(assessment.overallScore)} transition-all duration-500`}
                  style={{ width: `${assessment.overallScore}%` }}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {assessment.summary}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {assessment.stats.totalClaims}
                </div>
                <div className="text-gray-500">Total Claims</div>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {assessment.stats.supportedClaims}
                </div>
                <div className="text-gray-500">Supported</div>
              </div>
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {assessment.stats.unsupportedClaims}
                </div>
                <div className="text-gray-500">Unsupported</div>
              </div>
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {assessment.stats.speculativeClaims}
                </div>
                <div className="text-gray-500">Speculative</div>
              </div>
            </div>

            {/* Issues */}
            {assessment.issues.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Issues ({assessment.issues.length})
                </h3>
                {assessment.issues.map((issue, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setExpandedIssue(expandedIssue === index ? null : index)}
                  >
                    <div className="flex items-start gap-2">
                      <span>{getSeverityIcon(issue.severity)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs">{getTypeIcon(issue.type)}</span>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {getTypeLabel(issue.type)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          &ldquo;{issue.text}&rdquo;
                        </p>
                        {expandedIssue === index && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-green-600 dark:text-green-400">
                              <strong>Suggestion:</strong> {issue.suggestion}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {assessment.recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recommendations
                </h3>
                <ul className="space-y-1">
                  {assessment.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
