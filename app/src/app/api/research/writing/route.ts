import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/research/writing - List writing projects
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    const stage = searchParams.get('stage')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    let query = supabase
      .from('writing_projects')
      .select(`
        *,
        document:documents (id, title)
      `)
      .eq('workspace_id', workspaceId)

    if (stage) {
      query = query.eq('current_stage', stage)
    }

    const { data: projects, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('List writing projects error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/research/writing - Create a writing project
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      workspace_id,
      document_id,
      title,
      target_journal,
      target_conference,
      deadline,
      word_count_target,
      checklist
    } = body

    if (!workspace_id || !document_id || !title) {
      return NextResponse.json({ error: 'workspace_id, document_id, and title required' }, { status: 400 })
    }

    // Default checklist for academic writing
    const defaultChecklist = checklist || [
      { id: '1', label: 'Abstract complete', category: 'Structure' },
      { id: '2', label: 'Introduction sets context', category: 'Structure' },
      { id: '3', label: 'Methods clearly described', category: 'Structure' },
      { id: '4', label: 'Results presented logically', category: 'Structure' },
      { id: '5', label: 'Discussion addresses implications', category: 'Structure' },
      { id: '6', label: 'All claims cited', category: 'Citations' },
      { id: '7', label: 'Citation style consistent', category: 'Citations' },
      { id: '8', label: 'Bibliography complete', category: 'Citations' },
      { id: '9', label: 'Grammar and spelling checked', category: 'Polish' },
      { id: '10', label: 'Formatting meets guidelines', category: 'Polish' }
    ]

    const { data: project, error } = await supabase
      .from('writing_projects')
      .insert({
        workspace_id,
        document_id,
        title,
        target_journal,
        target_conference,
        deadline,
        word_count_target,
        checklist: defaultChecklist,
        completed_items: [],
        current_stage: 'draft',
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Create writing project error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/research/writing - Update a writing project
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { project_id, ...updates } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: project, error } = await supabase
      .from('writing_projects')
      .update(updates)
      .eq('id', project_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Update writing project error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
