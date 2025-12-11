'use client'

import { useState, useCallback, useEffect } from 'react'

export interface Branch {
  id: string
  document_id: string
  name: string
  parent_branch_id: string | null
  is_main: boolean
  created_by: string | null
  created_at: string
  merged_at: string | null
  merged_by: string | null
  children: string[]
  section_count: number
  creator_name?: string
}

export interface SectionDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  order_index: number
  source_section?: {
    id: string
    title: string | null
    content_text: string | null
  }
  target_section?: {
    id: string
    title: string | null
    content_text: string | null
  }
  changes?: string[]
}

export interface MergeConflict {
  section_index: number
  source_content: string | null
  target_content: string | null
  conflict_type: 'both_modified' | 'deleted_modified'
  resolution?: 'keep_source' | 'keep_target' | 'merge' | 'custom'
  merged_content?: string
}

export function useBranches(documentId: string) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [mainBranchId, setMainBranchId] = useState<string | null>(null)
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all branches
  const fetchBranches = useCallback(async () => {
    if (!documentId) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/documents/${documentId}/branches`)
      if (!res.ok) throw new Error('Failed to fetch branches')

      const data = await res.json()
      setBranches(data.branches || [])
      setMainBranchId(data.main_branch_id)

      // Set current branch to main if not set
      if (!currentBranchId && data.main_branch_id) {
        setCurrentBranchId(data.main_branch_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches')
    } finally {
      setLoading(false)
    }
  }, [documentId, currentBranchId])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  // Create a new branch
  const createBranch = useCallback(async (name: string, parentBranchId: string, copyContent = true) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          parent_branch_id: parentBranchId,
          copy_content: copyContent,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create branch')
      }

      const data = await res.json()
      await fetchBranches()
      return data.branch
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create branch')
    }
  }, [documentId, fetchBranches])

  // Delete a branch
  const deleteBranch = useCallback(async (branchId: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/branches/${branchId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete branch')
      }

      // If we deleted the current branch, switch to main
      if (branchId === currentBranchId) {
        setCurrentBranchId(mainBranchId)
      }

      await fetchBranches()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete branch')
    }
  }, [documentId, currentBranchId, mainBranchId, fetchBranches])

  // Rename a branch
  const renameBranch = useCallback(async (branchId: string, newName: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/branches/${branchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to rename branch')
      }

      await fetchBranches()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to rename branch')
    }
  }, [documentId, fetchBranches])

  // Compare two branches
  const compareBranches = useCallback(async (sourceBranchId: string, targetBranchId: string) => {
    try {
      const res = await fetch(
        `/api/documents/${documentId}/branches/${sourceBranchId}/diff?compare_to=${targetBranchId}`
      )

      if (!res.ok) {
        throw new Error('Failed to compare branches')
      }

      return await res.json() as {
        diffs: SectionDiff[]
        summary: {
          total_sections: number
          added: number
          removed: number
          modified: number
          unchanged: number
        }
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to compare branches')
    }
  }, [documentId])

  // Get AI analysis of a section diff
  const analyzeSection = useCallback(async (sourceBranchId: string, targetBranchId: string, sectionIndex: number) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/branches/${sourceBranchId}/diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compare_to: targetBranchId,
          section_index: sectionIndex,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to analyze section')
      }

      return await res.json()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to analyze section')
    }
  }, [documentId])

  // Merge branches
  const mergeBranches = useCallback(async (
    sourceBranchId: string,
    targetBranchId: string,
    options: {
      resolutions?: Array<{ section_index: number; resolution: string; merged_content?: string }>
      auto_merge?: boolean
      merge_message?: string
    } = {}
  ) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/branches/${sourceBranchId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_branch_id: targetBranchId,
          ...options,
        }),
      })

      const data = await res.json()

      if (data.status === 'conflicts') {
        return {
          success: false,
          conflicts: data.conflicts as MergeConflict[],
          message: data.message,
        }
      }

      await fetchBranches()

      return {
        success: true,
        message: data.message,
        sections_merged: data.sections_merged,
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to merge branches')
    }
  }, [documentId, fetchBranches])

  // Get AI merge suggestion
  const getMergeSuggestion = useCallback(async (sourceContent: string, targetContent: string, context?: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/branches/${currentBranchId}/merge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_content: sourceContent,
          target_content: targetContent,
          context,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to get merge suggestion')
      }

      const data = await res.json()
      return data.suggestion
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to get merge suggestion')
    }
  }, [documentId, currentBranchId])

  // Switch current branch
  const switchBranch = useCallback((branchId: string) => {
    setCurrentBranchId(branchId)
  }, [])

  // Get current branch
  const currentBranch = branches.find(b => b.id === currentBranchId)

  // Get branch tree (for visualization)
  const getBranchTree = useCallback(() => {
    const mainBranch = branches.find(b => b.is_main)
    if (!mainBranch) return null

    const buildTree = (branch: Branch): Branch & { childBranches: Array<Branch & { childBranches: unknown[] }> } => ({
      ...branch,
      childBranches: branches
        .filter(b => b.parent_branch_id === branch.id)
        .map(buildTree),
    })

    return buildTree(mainBranch)
  }, [branches])

  return {
    // State
    branches,
    mainBranchId,
    currentBranchId,
    currentBranch,
    loading,
    error,

    // Actions
    fetchBranches,
    createBranch,
    deleteBranch,
    renameBranch,
    compareBranches,
    analyzeSection,
    mergeBranches,
    getMergeSuggestion,
    switchBranch,

    // Computed
    getBranchTree,
    branchCount: branches.length,
    hasMultipleBranches: branches.length > 1,
  }
}
