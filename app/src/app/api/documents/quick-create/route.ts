import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/documents/quick-create - Create document with auto workspace/project
 *
 * This endpoint simplifies document creation by automatically creating
 * a workspace and project if needed.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { title } = body

    // Generate default title if not provided
    const documentTitle = title?.trim() || `Untitled ${new Date().toLocaleDateString()}`

    // Step 1: Get or create workspace
    let workspaceId: string

    const { data: existingWorkspaces } = await supabase
      .from('workspaces')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)

    if (existingWorkspaces && existingWorkspaces.length > 0) {
      workspaceId = existingWorkspaces[0].id
    } else {
      // Create default workspace
      const { data: newWorkspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({
          name: 'My Research',
          owner_id: user.id,
        })
        .select('id')
        .single()

      if (wsError) {
        console.error('Error creating workspace:', wsError)
        return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
      }

      workspaceId = newWorkspace.id

      // Add user as owner member
      await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: 'owner',
      })
    }

    // Step 2: Get or create project in workspace
    let projectId: string

    const { data: existingProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(1)

    if (existingProjects && existingProjects.length > 0) {
      projectId = existingProjects[0].id
    } else {
      // Create default project
      const { data: newProject, error: projError } = await supabase
        .from('projects')
        .insert({
          name: 'Research Project',
          workspace_id: workspaceId,
        })
        .select('id')
        .single()

      if (projError) {
        console.error('Error creating project:', projError)
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
      }

      projectId = newProject.id
    }

    // Step 3: Create the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        name: documentTitle,
        project_id: projectId,
        created_by: user.id,
      })
      .select()
      .single()

    if (docError) {
      console.error('Error creating document:', docError)
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
    }

    // Step 4: Create main branch
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
      console.error('Error creating branch:', branchError)
      // Cleanup document
      await supabase.from('documents').delete().eq('id', document.id)
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
    }

    // Step 5: Create initial section
    await supabase.from('doc_sections').insert({
      branch_id: mainBranch.id,
      order_index: 0,
      title: 'Introduction',
      content_json: { type: 'doc', content: [{ type: 'paragraph' }] },
      content_text: '',
    })

    return NextResponse.json({
      document: {
        id: document.id,
        name: document.name,
        project_id: projectId,
        workspace_id: workspaceId,
        main_branch_id: mainBranch.id,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Quick create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
