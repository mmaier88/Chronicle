import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/workspaces/[id] - Get workspace details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspace with member info
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select(`
        *,
        workspace_members (
          user_id,
          role,
          invited_at,
          joined_at
        )
      `)
      .eq('id', id)
      .single()

    if (error || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Check if user is a member
    const userMember = workspace.workspace_members.find(
      (m: { user_id: string }) => m.user_id === user.id
    )
    if (!userMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        slug: workspace.slug,
        owner_id: workspace.owner_id,
        created_at: workspace.created_at,
        updated_at: workspace.updated_at,
        member_count: workspace.workspace_members.length,
      },
      role: userMember.role,
    })

  } catch (error) {
    console.error('Get workspace error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/workspaces/[id] - Update workspace
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user's role
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, slug } = body

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (slug !== undefined) updates.slug = slug

    const { data: workspace, error: updateError } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update workspace error:', updateError)
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'workspace.update',
      p_workspace_id: id,
      p_target_type: 'workspace',
      p_target_id: id,
      p_details: updates,
    })

    return NextResponse.json({ workspace })

  } catch (error) {
    console.error('Update workspace error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/workspaces/[id] - Delete workspace
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only owner can delete
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (!workspace || workspace.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only workspace owner can delete' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete workspace error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete workspace error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
