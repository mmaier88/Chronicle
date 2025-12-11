import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>
}) {
  const { id: workspaceId, projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch project with workspace info
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      workspaces!inner(name)
    `)
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !project) {
    notFound()
  }

  // Fetch documents in this project
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })

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
            <Link href={`/workspace/${workspaceId}`} className="hover:text-gray-700 dark:hover:text-gray-200">
              {project.workspaces?.name || 'Workspace'}
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {project.description}
            </p>
          )}
        </div>
        <Link
          href={`/workspace/${workspaceId}/project/${projectId}/document/new`}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Document
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {documents?.length || 0}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Documents
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last updated
          </div>
          <div className="text-lg font-medium text-gray-900 dark:text-white">
            {new Date(project.updated_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Documents
        </h2>

        {documents && documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {doc.title}
                </h3>
                <div className="flex items-center mt-4 text-xs text-gray-400">
                  <span>Updated {new Date(doc.updated_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No documents yet
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Create your first document to start writing
            </p>
            <Link
              href={`/workspace/${workspaceId}/project/${projectId}/document/new`}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Document
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
