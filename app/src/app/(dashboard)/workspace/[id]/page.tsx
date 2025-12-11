import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch workspace with membership check
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select(`
      *,
      workspace_members!inner(role, joined_at)
    `)
    .eq('id', id)
    .single()

  if (error || !workspace) {
    notFound()
  }

  const userRole = workspace.workspace_members?.[0]?.role || 'viewer'
  const isAdmin = ['owner', 'admin'].includes(userRole)

  // Fetch projects in this workspace
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', id)
    .order('updated_at', { ascending: false })

  // Fetch member count
  const { count: memberCount } = await supabase
    .from('workspace_members')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', id)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-200">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">{workspace.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {workspace.name}
          </h1>
          {workspace.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {workspace.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href={`/workspace/${id}/settings`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
          )}
          <Link
            href={`/workspace/${id}/project/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {projects?.length || 0}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Projects
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {memberCount || 1}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Members
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
            {userRole}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Your Role
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Projects
        </h2>

        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/workspace/${id}/project/${project.id}`}
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center mt-4 text-xs text-gray-400">
                  <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No projects yet
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Create your first project to start organizing your research
            </p>
            <Link
              href={`/workspace/${id}/project/new`}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Project
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
