import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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

  return (
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
        <Link
          href="/workspace/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Workspace
        </Link>
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
            0
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Documents
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            0
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Sources
          </div>
        </div>
      </div>
    </div>
  )
}
