import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/invitations/[token]/accept - Accept workspace invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Please sign in to accept this invitation' }, { status: 401 })
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    // Check if email matches (optional - can be configured)
    // For now, we allow any authenticated user to accept
    // In production, you might want to verify email matches

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', invitation.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      // Mark invitation as accepted even if already a member
      await supabase
        .from('workspace_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      return NextResponse.json({ error: 'You are already a member of this workspace' }, { status: 400 })
    }

    // Add user to workspace
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: invitation.role,
        invited_at: invitation.created_at,
        joined_at: new Date().toISOString(),
      })

    if (memberError) {
      console.error('Error adding member:', memberError)
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
    }

    // Mark invitation as accepted
    await supabase
      .from('workspace_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'workspace.invite_accept',
      p_workspace_id: invitation.workspace_id,
      p_target_type: 'member',
      p_target_id: user.id,
      p_details: { role: invitation.role, invitation_id: invitation.id },
    })

    // Get workspace name for response
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, slug')
      .eq('id', invitation.workspace_id)
      .single()

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace?.id,
        name: workspace?.name,
        slug: workspace?.slug,
        role: invitation.role,
      }
    })

  } catch (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/invitations/[token]/accept - Get invitation details (for preview)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Get invitation with workspace name
    const { data: invitation, error } = await supabase
      .from('workspace_invitations')
      .select(`
        id,
        email,
        role,
        expires_at,
        accepted_at,
        workspaces (
          id,
          name,
          slug
        )
      `)
      .eq('token', token)
      .single()

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }

    if (invitation.accepted_at) {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        workspace: invitation.workspaces,
      }
    })

  } catch (error) {
    console.error('Get invitation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
