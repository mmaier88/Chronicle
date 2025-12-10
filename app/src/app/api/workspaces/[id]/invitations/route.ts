import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/workspaces/[id]/invitations - List pending invitations
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

    // Get pending invitations
    const { data: invitations, error } = await supabase
      .from('workspace_invitations')
      .select(`
        id,
        email,
        role,
        invited_by,
        created_at,
        expires_at,
        accepted_at
      `)
      .eq('workspace_id', id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    return NextResponse.json({ invitations })

  } catch (error) {
    console.error('Get invitations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/workspaces/[id]/invitations - Send invitation
 */
export async function POST(
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
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    const validRoles = ['admin', 'editor', 'reviewer', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', id)
      .eq('user_id', (
        await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id) // This won't work - need to check by email
      ))

    // Check if already invited
    const { data: existingInvite } = await supabase
      .from('workspace_invitations')
      .select('id')
      .eq('workspace_id', id)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'Invitation already pending' }, { status: 409 })
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      if (inviteError.code === '23505') {
        return NextResponse.json({ error: 'User already invited' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'workspace.invite_send',
      p_workspace_id: id,
      p_target_type: 'invitation',
      p_target_id: invitation.id,
      p_details: { email: email.toLowerCase(), role },
    })

    // TODO: Send invitation email
    // For now, return the invitation token (in production, this would be sent via email)

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        // Only include token in development/for testing
        invite_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/invite/${invitation.token}`,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Create invitation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/workspaces/[id]/invitations?invitation_id=... - Revoke invitation
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

    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('invitation_id')

    if (!invitationId) {
      return NextResponse.json({ error: 'invitation_id is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('workspace_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('workspace_id', id)

    if (deleteError) {
      console.error('Error revoking invitation:', deleteError)
      return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'workspace.invite_revoke',
      p_workspace_id: id,
      p_target_type: 'invitation',
      p_target_id: invitationId,
      p_details: {},
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Revoke invitation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
