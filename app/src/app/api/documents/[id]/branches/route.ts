import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface Branch {
  id: string
  document_id: string
  name: string
  parent_branch_id: string | null
  is_main: boolean
  created_by: string | null
  created_at: string
  merged_at: string | null
  merged_by: string | null
}

/**
 * GET /api/documents/[id]/branches - List all branches for a document
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

    // Get all branches for the document
    const { data: branches, error } = await supabase
      .from('doc_branches')
      .select(`
        id,
        document_id,
        name,
        parent_branch_id,
        is_main,
        created_by,
        created_at,
        merged_at,
        merged_by,
        user_profiles!doc_branches_created_by_fkey (
          display_name
        )
      `)
      .eq('document_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching branches:', error)
      return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 })
    }

    // Get section counts for each branch
    const branchIds = branches.map(b => b.id)
    const { data: sectionCounts } = await supabase
      .from('doc_sections')
      .select('branch_id')
      .in('branch_id', branchIds)

    const countsByBranch: Record<string, number> = {}
    for (const section of sectionCounts || []) {
      countsByBranch[section.branch_id] = (countsByBranch[section.branch_id] || 0) + 1
    }

    // Build branch tree structure
    const branchMap = new Map<string, Branch & { children: string[]; section_count: number; creator_name?: string }>()
    for (const branch of branches) {
      const profile = Array.isArray(branch.user_profiles) ? branch.user_profiles[0] : branch.user_profiles
      branchMap.set(branch.id, {
        ...branch,
        children: [],
        section_count: countsByBranch[branch.id] || 0,
        creator_name: profile?.display_name,
      })
    }

    // Link children to parents
    for (const branch of branchMap.values()) {
      if (branch.parent_branch_id && branchMap.has(branch.parent_branch_id)) {
        branchMap.get(branch.parent_branch_id)!.children.push(branch.id)
      }
    }

    // Find main branch
    const mainBranch = branches.find(b => b.is_main)

    return NextResponse.json({
      branches: Array.from(branchMap.values()),
      main_branch_id: mainBranch?.id,
    })

  } catch (error) {
    console.error('Get branches error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents/[id]/branches - Create a new branch
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
    const { name, parent_branch_id, copy_content = true } = body

    if (!name) {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })
    }

    // If no parent_branch_id, find or create the main branch
    let actualParentBranchId = parent_branch_id

    if (!actualParentBranchId) {
      // Try to find the main branch
      const { data: mainBranch } = await supabase
        .from('doc_branches')
        .select('id')
        .eq('document_id', id)
        .eq('is_main', true)
        .single()

      if (mainBranch) {
        actualParentBranchId = mainBranch.id
      } else {
        // Create a main branch first
        const { data: newMainBranch, error: mainError } = await supabase
          .from('doc_branches')
          .insert({
            document_id: id,
            name: 'main',
            is_main: true,
            created_by: user.id,
          })
          .select()
          .single()

        if (mainError) {
          console.error('Error creating main branch:', mainError)
          return NextResponse.json({ error: 'Failed to create main branch' }, { status: 500 })
        }

        actualParentBranchId = newMainBranch.id
      }
    }

    // Verify parent branch exists and belongs to this document
    const { data: parentBranch, error: parentError } = await supabase
      .from('doc_branches')
      .select('id, document_id')
      .eq('id', actualParentBranchId)
      .eq('document_id', id)
      .single()

    if (parentError || !parentBranch) {
      return NextResponse.json({ error: 'Parent branch not found' }, { status: 404 })
    }

    // Create the new branch
    const { data: branch, error: createError } = await supabase
      .from('doc_branches')
      .insert({
        document_id: id,
        name,
        parent_branch_id: actualParentBranchId,
        is_main: false,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating branch:', createError)
      return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 })
    }

    // Copy sections from parent branch if requested
    if (copy_content) {
      const { data: parentSections } = await supabase
        .from('doc_sections')
        .select('order_index, title, content_json, content_text')
        .eq('branch_id', actualParentBranchId)
        .order('order_index')

      if (parentSections && parentSections.length > 0) {
        const newSections = parentSections.map(section => ({
          document_id: id,
          branch_id: branch.id,
          order_index: section.order_index,
          title: section.title,
          content_json: section.content_json,
          content_text: section.content_text,
        }))

        await supabase.from('doc_sections').insert(newSections)
      }
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'document.branch_create',
      p_document_id: id,
      p_target_type: 'branch',
      p_target_id: branch.id,
      p_details: { name, parent_branch_id: actualParentBranchId, copy_content },
    })

    return NextResponse.json({ branch }, { status: 201 })

  } catch (error) {
    console.error('Create branch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
