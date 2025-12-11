import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/documents/[id]/branches/[branchId] - Get branch details with content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const { id, branchId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get branch details
    const { data: branch, error: branchError } = await supabase
      .from('doc_branches')
      .select(`
        *,
        user_profiles!doc_branches_created_by_fkey (
          display_name
        )
      `)
      .eq('id', branchId)
      .eq('document_id', id)
      .single()

    if (branchError || !branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Get sections
    const { data: sections } = await supabase
      .from('doc_sections')
      .select('*')
      .eq('branch_id', branchId)
      .order('order_index')

    const profile = Array.isArray(branch.user_profiles) ? branch.user_profiles[0] : branch.user_profiles

    return NextResponse.json({
      branch: {
        ...branch,
        creator_name: profile?.display_name,
      },
      sections: sections || [],
    })

  } catch (error) {
    console.error('Get branch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/documents/[id]/branches/[branchId] - Update branch (rename)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const { id, branchId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    // Check branch exists
    const { data: existing } = await supabase
      .from('doc_branches')
      .select('is_main')
      .eq('id', branchId)
      .eq('document_id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Update branch
    const { data: branch, error: updateError } = await supabase
      .from('doc_branches')
      .update({ name })
      .eq('id', branchId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating branch:', updateError)
      return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 })
    }

    return NextResponse.json({ branch })

  } catch (error) {
    console.error('Update branch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/documents/[id]/branches/[branchId] - Delete branch
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const { id, branchId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check branch exists and is not main
    const { data: branch } = await supabase
      .from('doc_branches')
      .select('is_main, name')
      .eq('id', branchId)
      .eq('document_id', id)
      .single()

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    if (branch.is_main) {
      return NextResponse.json({ error: 'Cannot delete main branch' }, { status: 400 })
    }

    // Check no child branches
    const { data: children } = await supabase
      .from('doc_branches')
      .select('id')
      .eq('parent_branch_id', branchId)
      .limit(1)

    if (children && children.length > 0) {
      return NextResponse.json({ error: 'Cannot delete branch with child branches' }, { status: 400 })
    }

    // Delete branch (cascade will delete sections)
    const { error: deleteError } = await supabase
      .from('doc_branches')
      .delete()
      .eq('id', branchId)

    if (deleteError) {
      console.error('Error deleting branch:', deleteError)
      return NextResponse.json({ error: 'Failed to delete branch' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'document.branch_delete',
      p_document_id: id,
      p_target_type: 'branch',
      p_target_id: branchId,
      p_details: { name: branch.name },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete branch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
