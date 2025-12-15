import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/documents/[id]/merge-requests/[mrId] - Get a specific merge request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mrId: string }> }
) {
  try {
    const { id, mrId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: mergeRequest, error } = await supabase
      .from('merge_requests')
      .select(`
        id,
        document_id,
        source_branch_id,
        target_branch_id,
        title,
        description,
        status,
        created_by,
        created_at,
        updated_at,
        merged_at,
        merged_by,
        merged_snapshot_id,
        user_profiles!merge_requests_created_by_fkey (
          display_name
        ),
        merged_by_profile:user_profiles!merge_requests_merged_by_fkey (
          display_name
        ),
        source_branch:doc_branches!merge_requests_source_branch_id_fkey (
          name
        ),
        target_branch:doc_branches!merge_requests_target_branch_id_fkey (
          name
        )
      `)
      .eq('id', mrId)
      .eq('document_id', id)
      .single()

    if (error || !mergeRequest) {
      return NextResponse.json({ error: 'Merge request not found' }, { status: 404 })
    }

    // Get comments count
    const { count: commentsCount } = await supabase
      .from('merge_request_comments')
      .select('*', { count: 'exact', head: true })
      .eq('merge_request_id', mrId)

    const profile = Array.isArray(mergeRequest.user_profiles)
      ? mergeRequest.user_profiles[0]
      : mergeRequest.user_profiles
    const mergedByProfile = Array.isArray(mergeRequest.merged_by_profile)
      ? mergeRequest.merged_by_profile[0]
      : mergeRequest.merged_by_profile
    const sourceBranch = Array.isArray(mergeRequest.source_branch)
      ? mergeRequest.source_branch[0]
      : mergeRequest.source_branch
    const targetBranch = Array.isArray(mergeRequest.target_branch)
      ? mergeRequest.target_branch[0]
      : mergeRequest.target_branch

    return NextResponse.json({
      merge_request: {
        ...mergeRequest,
        creator_name: profile?.display_name,
        merged_by_name: mergedByProfile?.display_name,
        source_branch_name: sourceBranch?.name,
        target_branch_name: targetBranch?.name,
        comments_count: commentsCount || 0,
      },
    })

  } catch (error) {
    console.error('Get merge request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/documents/[id]/merge-requests/[mrId] - Update merge request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mrId: string }> }
) {
  try {
    const { id, mrId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, status } = body

    // Get current merge request
    const { data: currentMR, error: fetchError } = await supabase
      .from('merge_requests')
      .select('id, status, created_by')
      .eq('id', mrId)
      .eq('document_id', id)
      .single()

    if (fetchError || !currentMR) {
      return NextResponse.json({ error: 'Merge request not found' }, { status: 404 })
    }

    // Only creator can update title/description
    if ((title || description) && currentMR.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the creator can update title/description' }, { status: 403 })
    }

    // Can't update merged/closed merge requests
    if (currentMR.status !== 'open' && status !== currentMR.status) {
      return NextResponse.json(
        { error: 'Cannot update status of merged or closed merge request' },
        { status: 400 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (title) updates.title = title
    if (description !== undefined) updates.description = description
    if (status && ['open', 'closed'].includes(status)) {
      updates.status = status
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
    }

    const { data: mergeRequest, error: updateError } = await supabase
      .from('merge_requests')
      .update(updates)
      .eq('id', mrId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating merge request:', updateError)
      return NextResponse.json({ error: 'Failed to update merge request' }, { status: 500 })
    }

    return NextResponse.json({ merge_request: mergeRequest })

  } catch (error) {
    console.error('Update merge request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
