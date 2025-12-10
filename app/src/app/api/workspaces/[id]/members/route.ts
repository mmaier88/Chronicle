import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/workspaces/[id]/members - List workspace members
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

    // Check membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all members with user profiles
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select(`
        user_id,
        role,
        invited_at,
        joined_at,
        user_profiles (
          display_name,
          avatar_url
        )
      `)
      .eq('workspace_id', id)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching members:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Get user emails from auth (only for admins)
    let memberEmails: Record<string, string> = {}
    if (['owner', 'admin'].includes(membership.role)) {
      // Get emails via service role (would need separate endpoint or edge function)
      // For now, we'll just return what we have
    }

    const result = members.map(m => {
      const profile = Array.isArray(m.user_profiles) ? m.user_profiles[0] : m.user_profiles
      return {
        user_id: m.user_id,
        role: m.role,
        invited_at: m.invited_at,
        joined_at: m.joined_at,
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
        email: memberEmails[m.user_id],
      }
    })

    return NextResponse.json({ members: result })

  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/workspaces/[id]/members - Update member role
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

    // Check admin access
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, role } = body

    if (!user_id || !role) {
      return NextResponse.json({ error: 'user_id and role are required' }, { status: 400 })
    }

    const validRoles = ['admin', 'editor', 'reviewer', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Can't change owner's role
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (workspace?.owner_id === user_id) {
      return NextResponse.json({ error: "Cannot change owner's role" }, { status: 400 })
    }

    // Admins can't promote to owner
    if (membership.role === 'admin' && role === 'owner') {
      return NextResponse.json({ error: 'Only owner can transfer ownership' }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', id)
      .eq('user_id', user_id)

    if (updateError) {
      console.error('Update member error:', updateError)
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'workspace.member_role_change',
      p_workspace_id: id,
      p_target_type: 'member',
      p_target_id: user_id,
      p_details: { new_role: role },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/workspaces/[id]/members - Remove member
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

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('user_id')

    if (!targetUserId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Users can remove themselves, admins can remove others
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const isSelf = targetUserId === user.id
    const isAdmin = ['owner', 'admin'].includes(membership.role)

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Can't remove the owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (workspace?.owner_id === targetUserId) {
      return NextResponse.json({ error: 'Cannot remove workspace owner' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', id)
      .eq('user_id', targetUserId)

    if (deleteError) {
      console.error('Remove member error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'workspace.member_remove',
      p_workspace_id: id,
      p_target_type: 'member',
      p_target_id: targetUserId,
      p_details: { removed_by: user.id, self_removal: isSelf },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
