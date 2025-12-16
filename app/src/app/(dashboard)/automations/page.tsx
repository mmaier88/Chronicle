'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Workflow {
  id: string
  projectId: string
  workflowType: string
  name: string
  description: string
  schedule: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
}

interface Project {
  id: string
  name: string
  workspaceId: string
}

export default function AutomationsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [workflowsLoading, setWorkflowsLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadWorkflows(selectedProject)
    }
  }, [selectedProject])

  const loadProjects = async () => {
    const supabase = createClient()

    // Try to load projects, or use demo project
    const { data, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, workspace_id')
      .order('created_at', { ascending: false })

    if (projectsError) {
      setError('Failed to load projects')
      setLoading(false)
      return
    }

    if (!data?.length) {
      setProjects([])
      setError('No projects found. Create a project first to use automations.')
      setLoading(false)
      return
    } else {
      setProjects(data.map(p => ({ id: p.id, name: p.name, workspaceId: p.workspace_id })))
      setSelectedProject(data[0].id)
    }

    setLoading(false)
  }

  const loadWorkflows = async (projectId: string) => {
    setWorkflowsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/workflows?projectId=${projectId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load workflows')
      }

      setWorkflows(data.workflows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows')
    } finally {
      setWorkflowsLoading(false)
    }
  }

  const toggleWorkflow = async (workflow: Workflow) => {
    if (!selectedProject) return
    setUpdating(workflow.id)

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          workflowType: workflow.workflowType,
          enabled: !workflow.enabled
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update workflow')
      }

      setWorkflows(prev =>
        prev.map(w =>
          w.workflowType === workflow.workflowType
            ? { ...w, enabled: !workflow.enabled }
            : w
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workflow')
    } finally {
      setUpdating(null)
    }
  }

  const getScheduleIcon = (schedule: string) => {
    switch (schedule) {
      case 'daily':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      case 'weekly':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getWorkflowIcon = (type: string) => {
    switch (type) {
      case 'daily_index_refresh':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'weekly_exec_summary':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'weekly_inconsistency_scan':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case 'weekly_citation_check':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        )
      case 'weekly_risk_assessment':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const enabledCount = workflows.filter(w => w.enabled).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Automations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure automated workflows to keep your research up-to-date
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      {/* Project Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Project
        </label>
        <select
          value={selectedProject || ''}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full md:w-64 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {enabledCount}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Active Workflows
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {workflows.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Available Workflows
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                0
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Runs Today
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
          {error}
        </div>
      )}

      {/* Workflows Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Workflows
        </h2>

        {workflowsLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="w-6 h-6 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className={`p-6 rounded-lg border transition-all ${
                  workflow.enabled
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      workflow.enabled
                        ? 'bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {getWorkflowIcon(workflow.workflowType)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {workflow.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {workflow.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                          {getScheduleIcon(workflow.schedule)}
                          <span className="capitalize">{workflow.schedule}</span>
                        </span>
                        {workflow.lastRun && (
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            Last: {formatDate(workflow.lastRun)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleWorkflow(workflow)}
                    disabled={updating === workflow.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      workflow.enabled
                        ? 'bg-purple-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    } ${updating === workflow.id ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        workflow.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          How Automations Work
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
              1
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Enable Workflows</div>
              <div className="text-gray-500 dark:text-gray-400">Toggle on the workflows you want to automate</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
              2
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Scheduled Runs</div>
              <div className="text-gray-500 dark:text-gray-400">Workflows run automatically on their schedule</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
              3
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Get Notified</div>
              <div className="text-gray-500 dark:text-gray-400">Results appear in your notifications</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
