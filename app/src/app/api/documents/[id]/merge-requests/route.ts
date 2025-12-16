import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/documents/[id]/merge-requests - List merge requests for a document
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)

    let query = supabase
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
        source_branch:doc_branches!merge_requests_source_branch_id_fkey (
          name
        ),
        target_branch:doc_branches!merge_requests_target_branch_id_fkey (
          name
        )
      `)
      .eq('document_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: mergeRequests, error } = await query

    if (error) {
      console.error('Error fetching merge requests:', error)
      return NextResponse.json({ error: 'Failed to fetch merge requests' }, { status: 500 })
    }

    // Transform response
    const transformedMRs = mergeRequests?.map(mr => {
      const profile = Array.isArray(mr.user_profiles)
        ? mr.user_profiles[0]
        : mr.user_profiles
      const sourceBranch = Array.isArray(mr.source_branch)
        ? mr.source_branch[0]
        : mr.source_branch
      const targetBranch = Array.isArray(mr.target_branch)
        ? mr.target_branch[0]
        : mr.target_branch

      return {
        ...mr,
        creator_name: profile?.display_name,
        source_branch_name: sourceBranch?.name,
        target_branch_name: targetBranch?.name,
      }
    })

    return NextResponse.json({
      merge_requests: transformedMRs,
      limit,
      offset,
    })

  } catch (error) {
    console.error('Get merge requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents/[id]/merge-requests - Create a new merge request
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

    const body = await request.json()
    const { source_branch_id, target_branch_id, title, description } = body

    if (!source_branch_id || !target_branch_id || !title) {
      return NextResponse.json(
        { error: 'source_branch_id, target_branch_id, and title are required' },
        { status: 400 }
      )
    }

    if (source_branch_id === target_branch_id) {
      return NextResponse.json(
        { error: 'Cannot create merge request to the same branch' },
        { status: 400 }
      )
    }

    // Verify both branches exist and belong to document
    const { data: branches, error: branchError } = await supabase
      .from('doc_branches')
      .select('id')
      .eq('document_id', id)
      .in('id', [source_branch_id, target_branch_id])

    if (branchError || !branches || branches.length !== 2) {
      return NextResponse.json({ error: 'One or both branches not found' }, { status: 404 })
    }

    // Check if there's already an open merge request between these branches
    const { data: existingMR } = await supabase
      .from('merge_requests')
      .select('id')
      .eq('document_id', id)
      .eq('source_branch_id', source_branch_id)
      .eq('target_branch_id', target_branch_id)
      .eq('status', 'open')
      .single()

    if (existingMR) {
      return NextResponse.json(
        { error: 'An open merge request already exists between these branches' },
        { status: 409 }
      )
    }

    // Create merge request
    const { data: mergeRequest, error: createError } = await supabase
      .from('merge_requests')
      .insert({
        document_id: id,
        source_branch_id,
        target_branch_id,
        title,
        description,
        status: 'open',
        created_by: user.id,
      })
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
        source_branch:doc_branches!merge_requests_source_branch_id_fkey (
          name
        ),
        target_branch:doc_branches!merge_requests_target_branch_id_fkey (
          name
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating merge request:', createError)
      return NextResponse.json({ error: 'Failed to create merge request' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'document.merge_request_create',
      p_document_id: id,
      p_target_type: 'merge_request',
      p_target_id: mergeRequest.id,
      p_details: {
        title,
        source_branch_id,
        target_branch_id,
      },
    })

    return NextResponse.json({ merge_request: mergeRequest }, { status: 201 })

  } catch (error) {
    console.error('Create merge request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
