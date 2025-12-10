import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/workspaces - List user's workspaces
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspaces where user is a member or owner
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select(`
        *,
        workspace_members!inner (
          role,
          joined_at
        )
      `)
      .eq('workspace_members.user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching workspaces:', error)
      return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 })
    }

    // Transform to include user's role
    const result = workspaces.map(w => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      owner_id: w.owner_id,
      created_at: w.created_at,
      updated_at: w.updated_at,
      role: w.workspace_members[0]?.role,
      joined_at: w.workspace_members[0]?.joined_at,
    }))

    return NextResponse.json({ workspaces: result })

  } catch (error) {
    console.error('Workspaces handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/workspaces - Create a new workspace
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Generate slug if not provided
    const workspaceSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Create workspace
    const { data: workspace, error: createError } = await supabase
      .from('workspaces')
      .insert({
        name,
        slug: workspaceSlug,
        owner_id: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating workspace:', createError)
      if (createError.code === '23505') {
        return NextResponse.json({ error: 'Workspace slug already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
    }

    // Add creator as owner member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
        joined_at: new Date().toISOString(),
      })

    if (memberError) {
      console.error('Error adding owner member:', memberError)
      // Cleanup: delete the workspace
      await supabase.from('workspaces').delete().eq('id', workspace.id)
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'workspace.create',
      p_workspace_id: workspace.id,
      p_target_type: 'workspace',
      p_target_id: workspace.id,
      p_details: { name: workspace.name },
    })

    return NextResponse.json({
      workspace: {
        ...workspace,
        role: 'owner',
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Create workspace error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
