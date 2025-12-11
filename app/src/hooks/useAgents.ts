'use client'

import { useState, useCallback } from 'react'

// Types
interface AgentDefinition {
  id: string
  workspace_id?: string
  name: string
  agent_type: 'evidence' | 'fact_checker' | 'argument' | 'summarizer' | 'contradiction' | 'research' | 'writer' | 'critic' | 'custom'
  description?: string
  system_prompt: string
  model: string
  temperature: number
  max_tokens: number
  can_search_sources: boolean
  can_search_entities: boolean
  can_create_entities: boolean
  can_modify_document: boolean
  is_default: boolean
  created_at: string
}

interface AgentPipeline {
  id: string
  workspace_id: string
  name: string
  description?: string
  steps: PipelineStep[]
  parallel_groups: string[][]
  trigger_type: 'manual' | 'on_document_save' | 'scheduled'
  trigger_config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

interface PipelineStep {
  agent_id: string
  input_mapping: Record<string, string>
  output_mapping: Record<string, string>
}

interface AgentExecution {
  id: string
  workspace_id: string
  pipeline_id?: string
  agent_id?: string
  document_id?: string
  input_data: Record<string, unknown>
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused'
  started_at?: string
  completed_at?: string
  output_data?: Record<string, unknown>
  confidence?: number
  token_usage: { input_tokens?: number; output_tokens?: number }
  error_message?: string
  agent?: { id: string; name: string; agent_type: string }
  pipeline?: { id: string; name: string }
  created_at: string
}

interface ReasoningTrace {
  id: string
  execution_id: string
  step_number: number
  step_type: 'thought' | 'action' | 'observation' | 'conclusion'
  content: string
  sources_consulted: string[]
  entities_referenced: string[]
  started_at?: string
  completed_at?: string
  created_at: string
}

interface AgentDisagreement {
  id: string
  workspace_id: string
  pipeline_id?: string
  agent_a_execution_id: string
  agent_b_execution_id: string
  topic: string
  agent_a_position: string
  agent_b_position: string
  resolution?: string
  resolved_by?: 'user' | 'arbitration_agent' | 'voting'
  resolved_at?: string
  created_at: string
}

export function useAgents(workspaceId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Agents
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [pipelines, setPipelines] = useState<AgentPipeline[]>([])
  const [executions, setExecutions] = useState<AgentExecution[]>([])
  const [currentExecution, setCurrentExecution] = useState<AgentExecution | null>(null)
  const [reasoningTraces, setReasoningTraces] = useState<ReasoningTrace[]>([])
  const [disagreements, setDisagreements] = useState<AgentDisagreement[]>([])

  // === Agent Definitions ===

  const fetchAgents = useCallback(async (includeDefaults = true) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/agents?workspace_id=${workspaceId}&include_defaults=${includeDefaults}`
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAgents(data.agents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const createAgent = useCallback(async (params: {
    name: string
    agent_type: string
    description?: string
    system_prompt: string
    model?: string
    temperature?: number
    max_tokens?: number
    can_search_sources?: boolean
    can_search_entities?: boolean
    can_create_entities?: boolean
    can_modify_document?: boolean
  }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, ...params })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAgents(prev => [data.agent, ...prev])
      return data.agent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const updateAgent = useCallback(async (agentId: string, updates: Partial<AgentDefinition>) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAgents(prev => prev.map(a => a.id === agentId ? data.agent : a))
      return data.agent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent')
      throw err
    }
  }, [])

  const deleteAgent = useCallback(async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAgents(prev => prev.filter(a => a.id !== agentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent')
      throw err
    }
  }, [])

  // === Pipelines ===

  const fetchPipelines = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/agents/pipelines?workspace_id=${workspaceId}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPipelines(data.pipelines || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pipelines')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const createPipeline = useCallback(async (params: {
    name: string
    description?: string
    steps: PipelineStep[]
    parallel_groups?: string[][]
    trigger_type?: string
    trigger_config?: Record<string, unknown>
  }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, ...params })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPipelines(prev => [data.pipeline, ...prev])
      return data.pipeline
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pipeline')
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  // === Execution ===

  const executeAgent = useCallback(async (params: {
    agent_id: string
    document_id?: string
    input_data: Record<string, unknown>
    pipeline_id?: string
  }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, ...params })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCurrentExecution(data.execution)
      setReasoningTraces(data.reasoning || [])
      setExecutions(prev => [data.execution, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute agent')
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const fetchExecutions = useCallback(async (params?: {
    agent_id?: string
    pipeline_id?: string
    status?: string
    limit?: number
  }) => {
    setLoading(true)
    try {
      const searchParams = new URLSearchParams({ workspace_id: workspaceId })
      if (params?.agent_id) searchParams.set('agent_id', params.agent_id)
      if (params?.pipeline_id) searchParams.set('pipeline_id', params.pipeline_id)
      if (params?.status) searchParams.set('status', params.status)
      if (params?.limit) searchParams.set('limit', params.limit.toString())

      const res = await fetch(`/api/agents/executions?${searchParams}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setExecutions(data.executions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch executions')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const getExecutionDetails = useCallback(async (executionId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/agents/executions/${executionId}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCurrentExecution(data.execution)
      setReasoningTraces(data.reasoning || [])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get execution details')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const cancelExecution = useCallback(async (executionId: string) => {
    try {
      const res = await fetch(`/api/agents/executions/${executionId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setExecutions(prev =>
        prev.map(e => e.id === executionId ? { ...e, status: 'failed' as const } : e)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel execution')
      throw err
    }
  }, [])

  // === Disagreements ===

  const fetchDisagreements = useCallback(async (resolved?: boolean) => {
    setLoading(true)
    try {
      let url = `/api/agents/disagreements?workspace_id=${workspaceId}`
      if (resolved !== undefined) url += `&resolved=${resolved}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDisagreements(data.disagreements || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch disagreements')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const createDisagreement = useCallback(async (params: {
    agent_a_execution_id: string
    agent_b_execution_id: string
    topic: string
    agent_a_position: string
    agent_b_position: string
    pipeline_id?: string
    auto_resolve?: boolean
  }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents/disagreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, ...params })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDisagreements(prev => [data.disagreement, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create disagreement')
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const resolveDisagreement = useCallback(async (disagreementId: string, resolution: string) => {
    try {
      const res = await fetch('/api/agents/disagreements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disagreement_id: disagreementId, resolution })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDisagreements(prev =>
        prev.map(d => d.id === disagreementId ? data.disagreement : d)
      )
      return data.disagreement
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve disagreement')
      throw err
    }
  }, [])

  return {
    loading,
    error,
    clearError: () => setError(null),

    // Agents
    agents,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,

    // Pipelines
    pipelines,
    fetchPipelines,
    createPipeline,

    // Execution
    executions,
    currentExecution,
    setCurrentExecution,
    reasoningTraces,
    executeAgent,
    fetchExecutions,
    getExecutionDetails,
    cancelExecution,

    // Disagreements
    disagreements,
    fetchDisagreements,
    createDisagreement,
    resolveDisagreement
  }
}
