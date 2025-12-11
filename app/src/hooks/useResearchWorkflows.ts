'use client'

import { useState, useCallback } from 'react'

// Types
interface LiteratureReview {
  id: string
  workspace_id: string
  title: string
  description?: string
  research_question?: string
  current_stage: 'search' | 'screen' | 'extract' | 'synthesize' | 'complete'
  inclusion_criteria: unknown[]
  exclusion_criteria: unknown[]
  quality_criteria: unknown[]
  total_sources: number
  screened_count: number
  included_count: number
  excluded_count: number
  created_at: string
}

interface ReviewSource {
  id: string
  review_id: string
  source_id: string
  screening_decision: 'include' | 'exclude' | 'maybe' | 'pending'
  screening_notes?: string
  quality_score?: number
  extracted_data: Record<string, unknown>
  extraction_complete: boolean
  source?: {
    id: string
    title: string
    authors?: string[]
    publication_year?: number
  }
}

interface Hypothesis {
  id: string
  workspace_id: string
  document_id?: string
  statement: string
  rationale?: string
  status: string
  confidence?: number
  supporting_evidence: unknown[]
  contradicting_evidence: unknown[]
  created_at: string
}

interface ArgumentMap {
  id: string
  workspace_id: string
  document_id?: string
  title: string
  description?: string
  central_claim?: string
  nodes?: ArgumentNode[]
  created_at: string
}

interface ArgumentNode {
  id: string
  map_id: string
  parent_id?: string
  argument_type: 'claim' | 'premise' | 'evidence' | 'counterargument' | 'rebuttal' | 'conclusion'
  stance: 'pro' | 'con' | 'neutral'
  content: string
  strength: number
  position_x: number
  position_y: number
}

interface WritingProject {
  id: string
  workspace_id: string
  document_id: string
  title: string
  target_journal?: string
  target_conference?: string
  deadline?: string
  current_stage: 'draft' | 'review' | 'revision' | 'finalize' | 'submitted' | 'published'
  checklist: unknown[]
  completed_items: unknown[]
  word_count_target?: number
  current_word_count: number
  created_at: string
}

interface WritingFeedback {
  id: string
  project_id: string
  stage: string
  feedback_type: string
  content: string
  resolved: boolean
  created_at: string
}

interface DetectedFallacy {
  id: string
  workspace_id: string
  document_id?: string
  argument_node_id?: string
  fallacy_type: string
  description: string
  excerpt?: string
  severity: 'low' | 'medium' | 'high'
  suggestion?: string
  detected_at: string
}

export function useResearchWorkflows(workspaceId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Literature Reviews
  const [reviews, setReviews] = useState<LiteratureReview[]>([])
  const [currentReview, setCurrentReview] = useState<LiteratureReview | null>(null)
  const [reviewSources, setReviewSources] = useState<ReviewSource[]>([])

  // Hypotheses
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])

  // Arguments
  const [argumentMaps, setArgumentMaps] = useState<ArgumentMap[]>([])
  const [currentMap, setCurrentMap] = useState<ArgumentMap | null>(null)

  // Writing
  const [writingProjects, setWritingProjects] = useState<WritingProject[]>([])
  const [currentProject, setCurrentProject] = useState<WritingProject | null>(null)
  const [projectFeedback, setProjectFeedback] = useState<WritingFeedback[]>([])

  // Fallacies
  const [fallacies, setFallacies] = useState<DetectedFallacy[]>([])

  // === Literature Reviews ===

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/research/literature-review?workspace_id=${workspaceId}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setReviews(data.reviews || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const createReview = useCallback(async (params: {
    title: string
    description?: string
    research_question?: string
    inclusion_criteria?: unknown[]
    exclusion_criteria?: unknown[]
  }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/research/literature-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, ...params })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setReviews(prev => [data.review, ...prev])
      return data.review
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create review')
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const screenSources = useCallback(async (reviewId: string, params: {
    source_id?: string
    decision?: string
    notes?: string
    auto_screen?: boolean
  }) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/research/literature-review/${reviewId}/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to screen sources')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // === Hypotheses ===

  const fetchHypotheses = useCallback(async (documentId?: string) => {
    setLoading(true)
    try {
      let url = `/api/research/hypotheses?workspace_id=${workspaceId}`
      if (documentId) url += `&document_id=${documentId}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setHypotheses(data.hypotheses || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hypotheses')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const createHypothesis = useCallback(async (params: {
    statement: string
    rationale?: string
    document_id?: string
    evaluate_against_sources?: boolean
  }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/research/hypotheses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, ...params })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setHypotheses(prev => [data.hypothesis, ...prev])
      return data.hypothesis
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create hypothesis')
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  // === Argument Maps ===

  const fetchArgumentMaps = useCallback(async (documentId?: string) => {
    setLoading(true)
    try {
      let url = `/api/research/arguments?workspace_id=${workspaceId}`
      if (documentId) url += `&document_id=${documentId}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setArgumentMaps(data.maps || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch argument maps')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const createArgumentMap = useCallback(async (params: {
    title: string
    description?: string
    central_claim?: string
    document_id?: string
    auto_generate?: boolean
  }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/research/arguments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, ...params })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setArgumentMaps(prev => [data.map, ...prev])
      setCurrentMap(data.map)
      return data.map
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create argument map')
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const addArgumentNode = useCallback(async (mapId: string, params: {
    parent_id?: string
    argument_type: string
    stance?: string
    content: string
    strength?: number
    position_x?: number
    position_y?: number
  }) => {
    try {
      const res = await fetch(`/api/research/arguments/${mapId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      return data.node
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add argument node')
      throw err
    }
  }, [])

  // === Writing Projects ===

  const fetchWritingProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/research/writing?workspace_id=${workspaceId}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setWritingProjects(data.projects || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch writing projects')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const createWritingProject = useCallback(async (params: {
    document_id: string
    title: string
    target_journal?: string
    target_conference?: string
    deadline?: string
    word_count_target?: number
  }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/research/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, ...params })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setWritingProjects(prev => [data.project, ...prev])
      return data.project
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create writing project')
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const generateFeedback = useCallback(async (projectId: string, documentContent?: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/research/writing/${projectId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_generate: true, document_content: documentContent })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProjectFeedback(prev => [...data.feedback, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate feedback')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // === Fallacy Detection ===

  const detectFallacies = useCallback(async (content: string, documentId?: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/research/fallacies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, document_id: documentId, content })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setFallacies(prev => [...data.fallacies, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect fallacies')
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const fetchFallacies = useCallback(async (documentId?: string) => {
    setLoading(true)
    try {
      let url = `/api/research/fallacies?workspace_id=${workspaceId}`
      if (documentId) url += `&document_id=${documentId}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setFallacies(data.fallacies || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fallacies')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  return {
    loading,
    error,
    clearError: () => setError(null),

    // Literature Reviews
    reviews,
    currentReview,
    setCurrentReview,
    reviewSources,
    fetchReviews,
    createReview,
    screenSources,

    // Hypotheses
    hypotheses,
    fetchHypotheses,
    createHypothesis,

    // Arguments
    argumentMaps,
    currentMap,
    setCurrentMap,
    fetchArgumentMaps,
    createArgumentMap,
    addArgumentNode,

    // Writing
    writingProjects,
    currentProject,
    setCurrentProject,
    projectFeedback,
    fetchWritingProjects,
    createWritingProject,
    generateFeedback,

    // Fallacies
    fallacies,
    detectFallacies,
    fetchFallacies
  }
}
