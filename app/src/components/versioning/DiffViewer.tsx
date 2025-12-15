'use client'

import { useState, useEffect } from 'react'
import { GitCompare, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react'

interface DiffLine {
  type: 'add' | 'remove' | 'unchanged'
  content: string
  lineNumber?: number
}

interface DiffViewerProps {
  documentId: string
  fromSnapshotId: string
  toSnapshotId: string
  onClose?: () => void
}

export function DiffViewer({
  documentId,
  fromSnapshotId,
  toSnapshotId,
  onClose,
}: DiffViewerProps) {
  const [diffLines, setDiffLines] = useState<DiffLine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromVersion, setFromVersion] = useState<string>('')
  const [toVersion, setToVersion] = useState<string>('')
  const [showUnchanged, setShowUnchanged] = useState(false)
  const [stats, setStats] = useState({ additions: 0, deletions: 0 })

  useEffect(() => {
    async function fetchDiff() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch both snapshots
        const [fromRes, toRes] = await Promise.all([
          fetch(`/api/documents/${documentId}/snapshots/${fromSnapshotId}`),
          fetch(`/api/documents/${documentId}/snapshots/${toSnapshotId}`)
        ])

        if (!fromRes.ok || !toRes.ok) {
          throw new Error('Failed to fetch snapshots')
        }

        const [fromData, toData] = await Promise.all([
          fromRes.json(),
          toRes.json()
        ])

        const fromSnapshot = fromData.snapshot
        const toSnapshot = toData.snapshot

        setFromVersion(`v${fromSnapshot.version_number}`)
        setToVersion(`v${toSnapshot.version_number}`)

        // Get text content from snapshots
        const fromText = fromSnapshot.content_text || extractTextFromCrdt(fromSnapshot.crdt_state)
        const toText = toSnapshot.content_text || extractTextFromCrdt(toSnapshot.crdt_state)

        // Compute simple line-by-line diff
        const diff = computeDiff(fromText, toText)
        setDiffLines(diff.lines)
        setStats({ additions: diff.additions, deletions: diff.deletions })

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load diff')
      } finally {
        setIsLoading(false)
      }
    }

    if (documentId && fromSnapshotId && toSnapshotId) {
      fetchDiff()
    }
  }, [documentId, fromSnapshotId, toSnapshotId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
        <span className="ml-3 text-gray-500">Computing diff...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    )
  }

  const filteredLines = showUnchanged
    ? diffLines
    : diffLines.filter(line => line.type !== 'unchanged')

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <GitCompare className="w-5 h-5 text-gray-500" />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Comparing {fromVersion} → {toVersion}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <Plus className="w-3 h-3" />
                {stats.additions} additions
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <Minus className="w-3 h-3" />
                {stats.deletions} deletions
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUnchanged(!showUnchanged)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            {showUnchanged ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showUnchanged ? 'Hide' : 'Show'} unchanged
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto font-mono text-sm">
        {filteredLines.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No changes between these versions
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredLines.map((line, index) => (
              <div
                key={index}
                className={`flex ${
                  line.type === 'add'
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : line.type === 'remove'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-white dark:bg-gray-900'
                }`}
              >
                <div className={`w-8 flex-shrink-0 text-center py-1 text-xs ${
                  line.type === 'add'
                    ? 'text-green-600 bg-green-100 dark:bg-green-900/40'
                    : line.type === 'remove'
                    ? 'text-red-600 bg-red-100 dark:bg-red-900/40'
                    : 'text-gray-400 bg-gray-50 dark:bg-gray-800'
                }`}>
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </div>
                <div className={`flex-1 px-3 py-1 whitespace-pre-wrap break-words ${
                  line.type === 'add'
                    ? 'text-green-800 dark:text-green-300'
                    : line.type === 'remove'
                    ? 'text-red-800 dark:text-red-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {line.content || ' '}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to extract text from CRDT state (Tiptap JSON)
function extractTextFromCrdt(crdtState: unknown): string {
  if (!crdtState) return ''

  if (typeof crdtState === 'string') {
    try {
      const parsed = JSON.parse(crdtState)
      return extractTextFromNode(parsed)
    } catch {
      return crdtState
    }
  }

  return extractTextFromNode(crdtState)
}

function extractTextFromNode(node: unknown): string {
  if (!node || typeof node !== 'object') return ''

  const n = node as Record<string, unknown>

  if (n.type === 'text' && typeof n.text === 'string') {
    return n.text
  }

  if (Array.isArray(n.content)) {
    return n.content.map(extractTextFromNode).join('')
  }

  return ''
}

// Simple line-by-line diff algorithm
function computeDiff(fromText: string, toText: string): { lines: DiffLine[], additions: number, deletions: number } {
  const fromLines = fromText.split('\n')
  const toLines = toText.split('\n')

  const lines: DiffLine[] = []
  let additions = 0
  let deletions = 0

  // Use a simple LCS-based approach for line diff
  const lcs = longestCommonSubsequence(fromLines, toLines)

  let fromIdx = 0
  let toIdx = 0
  let lcsIdx = 0

  while (fromIdx < fromLines.length || toIdx < toLines.length) {
    if (lcsIdx < lcs.length && fromIdx < fromLines.length && fromLines[fromIdx] === lcs[lcsIdx]) {
      // Line exists in both - unchanged
      if (toIdx < toLines.length && toLines[toIdx] === lcs[lcsIdx]) {
        lines.push({ type: 'unchanged', content: fromLines[fromIdx] })
        fromIdx++
        toIdx++
        lcsIdx++
      } else {
        // Line added in to
        lines.push({ type: 'add', content: toLines[toIdx] })
        additions++
        toIdx++
      }
    } else if (lcsIdx < lcs.length && toIdx < toLines.length && toLines[toIdx] === lcs[lcsIdx]) {
      // Line removed from from
      lines.push({ type: 'remove', content: fromLines[fromIdx] })
      deletions++
      fromIdx++
    } else if (fromIdx < fromLines.length) {
      // Line removed
      lines.push({ type: 'remove', content: fromLines[fromIdx] })
      deletions++
      fromIdx++
    } else if (toIdx < toLines.length) {
      // Line added
      lines.push({ type: 'add', content: toLines[toIdx] })
      additions++
      toIdx++
    }
  }

  return { lines, additions, deletions }
}

// LCS algorithm for line arrays
function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find LCS
  const result: string[] = []
  let i = m
  let j = n

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return result
}
