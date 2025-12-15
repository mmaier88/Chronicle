import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/documents/[id]/snapshots/[snapshotId] - Get a specific snapshot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const { id, snapshotId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: snapshot, error } = await supabase
      .from('doc_snapshots')
      .select(`
        id,
        document_id,
        branch_id,
        crdt_state,
        content_text,
        content_preview,
        word_count,
        version_number,
        commit_message,
        parent_snapshot_id,
        created_by,
        created_at,
        user_profiles!doc_snapshots_created_by_fkey (
          display_name
        ),
        doc_branches!doc_snapshots_branch_id_fkey (
          name,
          is_main
        )
      `)
      .eq('id', snapshotId)
      .eq('document_id', id)
      .single()

    if (error || !snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    const profile = Array.isArray(snapshot.user_profiles)
      ? snapshot.user_profiles[0]
      : snapshot.user_profiles
    const branch = Array.isArray(snapshot.doc_branches)
      ? snapshot.doc_branches[0]
      : snapshot.doc_branches

    return NextResponse.json({
      snapshot: {
        ...snapshot,
        creator_name: profile?.display_name,
        branch_name: branch?.name,
        is_main_branch: branch?.is_main,
      },
    })

  } catch (error) {
    console.error('Get snapshot error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/documents/[id]/snapshots/[snapshotId] - Delete a snapshot
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const { id, snapshotId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if snapshot exists and user has permission
    const { data: snapshot, error: fetchError } = await supabase
      .from('doc_snapshots')
      .select('id, created_by, version_number')
      .eq('id', snapshotId)
      .eq('document_id', id)
      .single()

    if (fetchError || !snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    // Only creator or admin can delete
    if (snapshot.created_by !== user.id) {
      // Check if user is admin by querying workspace membership
      const { data: document } = await supabase
        .from('documents')
        .select('project_id, projects!inner(workspace_id)')
        .eq('id', id)
        .single()

      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      const projects = document.projects as unknown as { workspace_id: string } | { workspace_id: string }[]
      const workspaceId = Array.isArray(projects) ? projects[0]?.workspace_id : projects?.workspace_id
      if (!workspaceId) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }

      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single()

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
    }

    // Delete the snapshot
    const { error: deleteError } = await supabase
      .from('doc_snapshots')
      .delete()
      .eq('id', snapshotId)

    if (deleteError) {
      console.error('Error deleting snapshot:', deleteError)
      return NextResponse.json({ error: 'Failed to delete snapshot' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'document.snapshot_delete',
      p_document_id: id,
      p_target_type: 'snapshot',
      p_target_id: snapshotId,
      p_details: { version_number: snapshot.version_number },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete snapshot error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
