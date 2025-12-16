import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface Snapshot {
  id: string
  document_id: string
  branch_id: string
  crdt_state: Record<string, unknown>
  content_text: string | null
  content_preview: string | null
  word_count: number
  version_number: number
  commit_message: string | null
  parent_snapshot_id: string | null
  created_by: string | null
  created_at: string
}

/**
 * GET /api/documents/[id]/snapshots - List all snapshots for a document
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
    const branchId = searchParams.get('branch_id')
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)

    // Build query
    let query = supabase
      .from('doc_snapshots')
      .select(`
        id,
        document_id,
        branch_id,
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
      .eq('document_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (branchId) {
      query = query.eq('branch_id', branchId)
    }

    const { data: snapshots, error } = await query

    if (error) {
      console.error('Error fetching snapshots:', error)
      return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 })
    }

    // Transform response
    const transformedSnapshots = snapshots?.map(snapshot => {
      const profile = Array.isArray(snapshot.user_profiles)
        ? snapshot.user_profiles[0]
        : snapshot.user_profiles
      const branch = Array.isArray(snapshot.doc_branches)
        ? snapshot.doc_branches[0]
        : snapshot.doc_branches

      return {
        ...snapshot,
        creator_name: profile?.display_name,
        branch_name: branch?.name,
        is_main_branch: branch?.is_main,
      }
    })

    // Get total count
    const { count } = await supabase
      .from('doc_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', id)
      .maybeSingle()

    return NextResponse.json({
      snapshots: transformedSnapshots,
      total: count || 0,
      limit,
      offset,
    })

  } catch (error) {
    console.error('Get snapshots error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents/[id]/snapshots - Create a new snapshot
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
    const { branch_id, crdt_state, content_text, commit_message } = body

    if (!branch_id || !crdt_state) {
      return NextResponse.json(
        { error: 'branch_id and crdt_state are required' },
        { status: 400 }
      )
    }

    // Verify branch exists and belongs to document
    const { data: branch, error: branchError } = await supabase
      .from('doc_branches')
      .select('id, document_id')
      .eq('id', branch_id)
      .eq('document_id', id)
      .single()

    if (branchError || !branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Get next version number
    const { data: versionData } = await supabase
      .rpc('get_next_version_number', {
        p_document_id: id,
        p_branch_id: branch_id
      })

    const versionNumber = versionData || 1

    // Get parent snapshot (most recent in this branch)
    const { data: parentSnapshot } = await supabase
      .from('doc_snapshots')
      .select('id')
      .eq('document_id', id)
      .eq('branch_id', branch_id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    // Generate preview and word count
    const plainText = content_text || ''
    const contentPreview = plainText.substring(0, 500)
    const wordCount = plainText.split(/\s+/).filter(Boolean).length

    // Create snapshot
    const { data: snapshot, error: createError } = await supabase
      .from('doc_snapshots')
      .insert({
        document_id: id,
        branch_id,
        crdt_state,
        content_text: plainText,
        content_preview: contentPreview,
        word_count: wordCount,
        version_number: versionNumber,
        commit_message: commit_message || `Version ${versionNumber}`,
        parent_snapshot_id: parentSnapshot?.id || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating snapshot:', createError)
      return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'document.snapshot_create',
      p_document_id: id,
      p_target_type: 'snapshot',
      p_target_id: snapshot.id,
      p_details: {
        version_number: versionNumber,
        commit_message: commit_message || `Version ${versionNumber}`,
        word_count: wordCount,
      },
    })

    return NextResponse.json({ snapshot }, { status: 201 })

  } catch (error) {
    console.error('Create snapshot error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
