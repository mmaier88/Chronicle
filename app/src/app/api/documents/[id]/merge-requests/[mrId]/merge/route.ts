import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/documents/[id]/merge-requests/[mrId]/merge - Execute merge
 */
export async function POST(
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
    const { commit_message } = body

    // Get merge request
    const { data: mergeRequest, error: mrError } = await supabase
      .from('merge_requests')
      .select(`
        id,
        document_id,
        source_branch_id,
        target_branch_id,
        title,
        status
      `)
      .eq('id', mrId)
      .eq('document_id', id)
      .single()

    if (mrError || !mergeRequest) {
      return NextResponse.json({ error: 'Merge request not found' }, { status: 404 })
    }

    if (mergeRequest.status !== 'open') {
      return NextResponse.json(
        { error: `Cannot merge - status is ${mergeRequest.status}` },
        { status: 400 }
      )
    }

    // Get source branch sections
    const { data: sourceSections, error: sourceError } = await supabase
      .from('doc_sections')
      .select('order_index, title, content_json, content_text')
      .eq('branch_id', mergeRequest.source_branch_id)
      .order('order_index')

    if (sourceError) {
      return NextResponse.json({ error: 'Failed to fetch source branch' }, { status: 500 })
    }

    // Start transaction-like operations

    // 1. Delete existing target branch sections
    const { error: deleteError } = await supabase
      .from('doc_sections')
      .delete()
      .eq('branch_id', mergeRequest.target_branch_id)

    if (deleteError) {
      console.error('Error deleting target sections:', deleteError)
      return NextResponse.json({ error: 'Failed to prepare merge' }, { status: 500 })
    }

    // 2. Copy source sections to target branch
    if (sourceSections && sourceSections.length > 0) {
      const newSections = sourceSections.map(section => ({
        document_id: id,
        branch_id: mergeRequest.target_branch_id,
        order_index: section.order_index,
        title: section.title,
        content_json: section.content_json,
        content_text: section.content_text,
      }))

      const { error: insertError } = await supabase
        .from('doc_sections')
        .insert(newSections)

      if (insertError) {
        console.error('Error inserting merged sections:', insertError)
        return NextResponse.json({ error: 'Failed to complete merge' }, { status: 500 })
      }
    }

    // 3. Create merged snapshot
    const mergedContent = sourceSections?.map(s => s.content_text).join('\n') || ''
    const wordCount = mergedContent.split(/\s+/).filter(Boolean).length

    // Get next version number for target branch
    const { data: versionData } = await supabase
      .rpc('get_next_version_number', {
        p_document_id: id,
        p_branch_id: mergeRequest.target_branch_id
      })

    const versionNumber = versionData || 1

    const { data: snapshot, error: snapshotError } = await supabase
      .from('doc_snapshots')
      .insert({
        document_id: id,
        branch_id: mergeRequest.target_branch_id,
        crdt_state: { sections: sourceSections },
        content_text: mergedContent,
        content_preview: mergedContent.substring(0, 500),
        word_count: wordCount,
        version_number: versionNumber,
        commit_message: commit_message || `Merge: ${mergeRequest.title}`,
        created_by: user.id,
      })
      .select()
      .single()

    if (snapshotError) {
      console.error('Error creating merge snapshot:', snapshotError)
      // Continue anyway - snapshot is optional
    }

    // 4. Update merge request status
    const { data: updatedMR, error: updateError } = await supabase
      .from('merge_requests')
      .update({
        status: 'merged',
        merged_at: new Date().toISOString(),
        merged_by: user.id,
        merged_snapshot_id: snapshot?.id || null,
      })
      .eq('id', mrId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating merge request:', updateError)
      return NextResponse.json({ error: 'Merge completed but status update failed' }, { status: 500 })
    }

    // 5. Mark source branch as merged
    await supabase
      .from('doc_branches')
      .update({
        merged_at: new Date().toISOString(),
        merged_by: user.id,
      })
      .eq('id', mergeRequest.source_branch_id)

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'document.merge_request_merge',
      p_document_id: id,
      p_target_type: 'merge_request',
      p_target_id: mrId,
      p_details: {
        title: mergeRequest.title,
        source_branch_id: mergeRequest.source_branch_id,
        target_branch_id: mergeRequest.target_branch_id,
        snapshot_id: snapshot?.id,
      },
    })

    return NextResponse.json({
      merge_request: updatedMR,
      snapshot,
      message: 'Merge completed successfully',
    })

  } catch (error) {
    console.error('Execute merge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
