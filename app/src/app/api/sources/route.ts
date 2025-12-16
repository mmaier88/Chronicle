import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // SECURITY: projectId is required to prevent leaking sources across workspaces
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // SECURITY: Verify user has access to this project's workspace
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build query - now always filtered by projectId
    const { data: sources, error } = await supabase
      .from('sources')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
    }

    // Add public URLs
    const sourcesWithUrls = sources?.map(source => {
      const { data: urlData } = supabase.storage
        .from('sources')
        .getPublicUrl(source.storage_path)

      return {
        ...source,
        url: urlData.publicUrl
      }
    }) || []

    return NextResponse.json({ sources: sourcesWithUrls })

  } catch (error) {
    console.error('Sources handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
