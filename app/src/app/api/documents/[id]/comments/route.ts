import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/documents/[id]/comments - List document comments
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

    // SECURITY: Verify user has access to this document's workspace
    const { data: doc } = await supabase
      .from('documents')
      .select('id, projects!inner(workspace_id)')
      .eq('id', id)
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const projects = doc.projects as unknown as { workspace_id: string } | { workspace_id: string }[]
    const workspaceId = Array.isArray(projects) ? projects[0]?.workspace_id : projects?.workspace_id

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const status = searchParams.get('status') // 'open', 'resolved', 'all'

    // Build query
    let query = supabase
      .from('document_comments')
      .select(`
        id,
        document_id,
        branch_id,
        section_id,
        parent_id,
        comment_type,
        status,
        start_offset,
        end_offset,
        suggested_text,
        content,
        author_id,
        resolved_by,
        resolved_at,
        created_at,
        updated_at,
        user_profiles!document_comments_author_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .eq('document_id', id)
      .is('parent_id', null) // Only get top-level comments
      .order('created_at', { ascending: false })

    if (branchId) {
      query = query.eq('branch_id', branchId)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: comments, error } = await query

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    // Get replies for each comment
    const commentIds = comments.map(c => c.id)
    const { data: replies } = await supabase
      .from('document_comments')
      .select(`
        id,
        parent_id,
        content,
        author_id,
        created_at,
        user_profiles!document_comments_author_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .in('parent_id', commentIds)
      .order('created_at', { ascending: true })

    // Group replies by parent
    type Reply = NonNullable<typeof replies>[number]
    const repliesByParent: Record<string, Reply[]> = {}
    for (const reply of replies || []) {
      const parentId = reply.parent_id
      if (parentId) {
        if (!repliesByParent[parentId]) {
          repliesByParent[parentId] = []
        }
        repliesByParent[parentId].push(reply)
      }
    }

    // Attach replies to comments
    const result = comments.map(c => ({
      ...c,
      author: c.user_profiles,
      replies: repliesByParent[c.id] || [],
    }))

    return NextResponse.json({ comments: result })

  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents/[id]/comments - Create comment or suggestion
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

    // SECURITY: Verify user has access to this document's workspace
    const { data: doc } = await supabase
      .from('documents')
      .select('id, projects!inner(workspace_id)')
      .eq('id', id)
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const projects = doc.projects as unknown as { workspace_id: string } | { workspace_id: string }[]
    const workspaceId = Array.isArray(projects) ? projects[0]?.workspace_id : projects?.workspace_id

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
      branch_id,
      section_id,
      parent_id,
      comment_type = 'comment',
      content,
      start_offset,
      end_offset,
      suggested_text,
    } = body

    if (!branch_id || !content) {
      return NextResponse.json({ error: 'branch_id and content are required' }, { status: 400 })
    }

    // Validate comment type
    const validTypes = ['comment', 'suggestion', 'question', 'approval']
    if (!validTypes.includes(comment_type)) {
      return NextResponse.json({ error: 'Invalid comment_type' }, { status: 400 })
    }

    // If it's a suggestion, suggested_text is required
    if (comment_type === 'suggestion' && !suggested_text) {
      return NextResponse.json({ error: 'suggested_text is required for suggestions' }, { status: 400 })
    }

    const { data: comment, error: createError } = await supabase
      .from('document_comments')
      .insert({
        document_id: id,
        branch_id,
        section_id,
        parent_id,
        comment_type,
        content,
        start_offset,
        end_offset,
        suggested_text,
        author_id: user.id,
      })
      .select(`
        *,
        user_profiles!document_comments_author_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating comment:', createError)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: comment_type === 'suggestion' ? 'suggestion.create' : 'comment.create',
      p_document_id: id,
      p_target_type: 'comment',
      p_target_id: comment.id,
      p_details: { comment_type, has_selection: !!start_offset },
    })

    return NextResponse.json({
      comment: {
        ...comment,
        author: comment.user_profiles,
        replies: [],
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
