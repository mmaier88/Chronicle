import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/projects - List projects (optionally filtered by workspace)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    let query = supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    const { data: projects, error } = await query

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    return NextResponse.json({ projects })

  } catch (error) {
    console.error('Projects handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/projects - Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, workspace_id } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!workspace_id) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }

    // Verify user has access to the workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 })
    }

    // Only owners, admins, and editors can create projects
    if (!['owner', 'admin', 'editor'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create project
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        name,
        description: description || null,
        workspace_id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating project:', createError)
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }

    // Log activity (non-blocking)
    supabase.rpc('log_activity', {
      p_action: 'project.create',
      p_workspace_id: workspace_id,
      p_project_id: project.id,
      p_target_type: 'project',
      p_target_id: project.id,
      p_details: { name: project.name },
    }).catch((err) => console.error('Failed to log activity:', err))

    return NextResponse.json({ project }, { status: 201 })

  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
