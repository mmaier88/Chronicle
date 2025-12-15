'use client'

import { useState, useEffect, useRef } from 'react'
import { GitBranch, ChevronDown, Plus, Check } from 'lucide-react'

interface Branch {
  id: string
  name: string
  is_main: boolean
  creator_name?: string
  section_count: number
  merged_at: string | null
}

interface BranchSelectorProps {
  documentId: string
  currentBranchId?: string
  onBranchChange?: (branchId: string) => void
  onCreateBranch?: () => void
}

export function BranchSelector({
  documentId,
  currentBranchId,
  onBranchChange,
  onCreateBranch,
}: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentBranch = branches.find(b => b.id === currentBranchId) || branches.find(b => b.is_main)

  useEffect(() => {
    async function fetchBranches() {
      try {
        const response = await fetch(`/api/documents/${documentId}/branches`)
        if (!response.ok) throw new Error('Failed to fetch branches')

        const data = await response.json()
        setBranches(data.branches || [])
      } catch (err) {
        console.error('Error fetching branches:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (documentId) {
      fetchBranches()
    }
  }, [documentId])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500">
        <GitBranch className="w-4 h-4" />
        <span>Loading...</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <GitBranch className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {currentBranch?.name || 'Select branch'}
        </span>
        {currentBranch?.is_main && (
          <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
            main
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Branches
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {branches.map(branch => (
              <button
                key={branch.id}
                onClick={() => {
                  onBranchChange?.(branch.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  branch.id === currentBranchId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <GitBranch className={`w-4 h-4 ${branch.is_main ? 'text-green-600' : 'text-purple-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {branch.name}
                    </span>
                    {branch.is_main && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                        main
                      </span>
                    )}
                    {branch.merged_at && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                        merged
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {branch.section_count} section{branch.section_count !== 1 ? 's' : ''}
                    {branch.creator_name && ` · ${branch.creator_name}`}
                  </div>
                </div>
                {branch.id === currentBranchId && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                onCreateBranch?.()
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create new branch
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
