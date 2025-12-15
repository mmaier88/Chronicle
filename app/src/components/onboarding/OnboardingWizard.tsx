'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface OnboardingWizardProps {
  userId: string
  userName?: string
  onComplete: () => void
  onSkip: () => void
}

type Step = 'welcome' | 'workspace' | 'project' | 'features' | 'complete'

const STEPS: { id: Step; title: string }[] = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'workspace', title: 'Create Workspace' },
  { id: 'project', title: 'Create Project' },
  { id: 'features', title: 'Key Features' },
  { id: 'complete', title: 'Ready!' },
]

export function OnboardingWizard({ userId, userName, onComplete, onSkip }: OnboardingWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [workspaceName, setWorkspaceName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) return
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create workspace')
      }

      const data = await response.json()
      setCreatedWorkspaceId(data.workspace.id)
      setCurrentStep('project')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!projectName.trim() || !createdWorkspaceId) return
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName.trim(),
          workspace_id: createdWorkspaceId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create project')
      }

      const data = await response.json()
      setCreatedProjectId(data.project.id)
      setCurrentStep('features')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      // Mark onboarding as complete in user preferences
      const supabase = createClient()
      await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          preferences: { onboarding_completed: true, onboarding_completed_at: new Date().toISOString() }
        }, { onConflict: 'id' })

      onComplete()

      // Navigate to the created project or workspace
      if (createdProjectId && createdWorkspaceId) {
        router.push(`/workspace/${createdWorkspaceId}/project/${createdProjectId}`)
      } else if (createdWorkspaceId) {
        router.push(`/workspace/${createdWorkspaceId}`)
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
      onComplete()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkipOnboarding = async () => {
    try {
      const supabase = createClient()
      await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          preferences: { onboarding_completed: true, onboarding_skipped: true }
        }, { onConflict: 'id' })
    } catch (err) {
      console.error('Failed to mark onboarding as skipped:', err)
    }
    onSkip()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {currentStep === 'welcome' && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to ResearchBase{userName ? `, ${userName.split(' ')[0]}` : ''}!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Your AI-native research environment. Let's get you set up in just a few steps.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">Smart Documents</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">AI-assisted writing with citations</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">Ask Your Sources</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Query PDFs with AI</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">Verify Claims</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Citation checking & safety</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">Collaborate</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Real-time team editing</p>
                </div>
              </div>
              <button
                onClick={() => setCurrentStep('workspace')}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          )}

          {currentStep === 'workspace' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Create your workspace
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                A workspace is where your team collaborates. You can invite others later.
              </p>
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Workspace name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g., My Research Lab"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && workspaceName.trim()) {
                      handleCreateWorkspace()
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('welcome')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateWorkspace}
                  disabled={!workspaceName.trim() || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Workspace'
                  )}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'project' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Create your first project
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Projects contain your documents and sources. Think of it as a research topic.
              </p>
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Literature Review, Thesis Draft"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && projectName.trim()) {
                      handleCreateProject()
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('workspace')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!projectName.trim() || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'features' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Key features to explore
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Here are some things you can do with ResearchBase:
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <kbd className="text-xs font-mono text-blue-600 dark:text-blue-400">/</kbd>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Slash Commands</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Type <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">/</kbd> in the editor to summarize, rewrite, or expand text with AI
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <kbd className="text-xs font-mono text-purple-600 dark:text-purple-400">K</kbd>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Ask Project</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Cmd/Ctrl+K</kbd> to ask questions about your uploaded PDFs
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Upload Sources</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Upload PDFs to your project. They'll be automatically processed for semantic search.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('project')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('complete')}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                You're all set!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Your workspace and project are ready. Start writing or upload some sources to get started.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      Go to Project
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with skip option */}
        {currentStep !== 'complete' && (
          <div className="px-8 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSkipOnboarding}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Skip setup for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
