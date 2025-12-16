import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { OnboardingCheck } from '@/components/onboarding'
import { QuickCreateDocument } from '@/components/QuickCreateDocument'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user's workspaces
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select(`
      *,
      workspace_members!inner(role)
    `)
    .order('created_at', { ascending: false })

  // Get workspace IDs for counting
  const workspaceIds = workspaces?.map(w => w.id) || []

  // Fetch document count (across all user's workspaces)
  let documentCount = 0
  let sourceCount = 0

  if (workspaceIds.length > 0) {
    // Get projects in user's workspaces
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .in('workspace_id', workspaceIds)

    const projectIds = projects?.map(p => p.id) || []

    if (projectIds.length > 0) {
      // Count documents
      const { count: docCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)

      documentCount = docCount || 0

      // Count sources
      const { count: srcCount } = await supabase
        .from('sources')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)

      sourceCount = srcCount || 0
    }
  }

  return (
    <OnboardingCheck
      userId={user?.id || ''}
      userName={user?.user_metadata?.full_name}
      hasWorkspaces={Boolean(workspaces && workspaces.length > 0)}
    >
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
      </div>

      {/* Prominent Quick Create */}
      <div className="max-w-xl">
        <QuickCreateDocument />
      </div>

      {/* Workspaces Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Your Workspaces
        </h2>

        {workspaces && workspaces.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={`/workspace/${workspace.id}`}
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {workspace.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {workspace.workspace_members?.[0]?.role || 'member'}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No workspaces yet
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Create your first workspace to get started
            </p>
            <Link
              href="/workspace/new"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Workspace
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces && workspaces.length > 0 ? (
            <Link
              href={`/workspace/${workspaces[0].id}`}
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Open Workspace
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Go to {workspaces[0].name}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <Link
              href="/workspace/new"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Create Workspace
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Get started with your first workspace
                  </p>
                </div>
              </div>
            </Link>
          )}

          <Link
            href="/workspace/new"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  New Workspace
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create a new research workspace
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/sources"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Upload PDF
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add sources to your library
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/automations"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Automations
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure workflow schedules
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {workspaces?.length || 0}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Workspaces
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {documentCount}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Documents
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {sourceCount}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Sources
          </div>
        </div>
      </div>
    </div>
    </OnboardingCheck>
  )
}
