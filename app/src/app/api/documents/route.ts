import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/documents - List documents (optionally filtered by project)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    let query = supabase
      .from('documents')
      .select('*')
      .order('updated_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: documents, error } = await query

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    return NextResponse.json({ documents })

  } catch (error) {
    console.error('Documents handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents - Create a new document
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, project_id } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!project_id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify user has access to the project
    const { data: project } = await supabase
      .from('projects')
      .select('id, workspace_id')
      .eq('id', project_id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check workspace membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 })
    }

    // Only owners, admins, and editors can create documents
    if (!['owner', 'admin', 'editor'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create document
    const { data: document, error: createError } = await supabase
      .from('documents')
      .insert({
        title,
        project_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating document:', createError)
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
    }

    // Create main branch for the document
    const { data: mainBranch, error: branchError } = await supabase
      .from('doc_branches')
      .insert({
        document_id: document.id,
        name: 'main',
        is_main: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (branchError) {
      console.error('Error creating main branch:', branchError)
      // Cleanup: delete the document
      await supabase.from('documents').delete().eq('id', document.id)
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
    }

    // Create initial empty section
    await supabase
      .from('doc_sections')
      .insert({
        document_id: document.id,
        branch_id: mainBranch.id,
        order_index: 0,
        title: 'Introduction',
        content_json: { type: 'doc', content: [{ type: 'paragraph' }] },
        content_text: '',
      })

    // Log activity (non-blocking)
    void (async () => {
      try {
        await supabase.rpc('log_activity', {
          p_action: 'document.create',
          p_workspace_id: project.workspace_id,
          p_project_id: project_id,
          p_document_id: document.id,
          p_target_type: 'document',
          p_target_id: document.id,
          p_details: { title: document.title },
        })
      } catch (err) {
        console.error('Failed to log activity:', err)
      }
    })()

    return NextResponse.json({
      document: {
        ...document,
        main_branch_id: mainBranch.id,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Create document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
