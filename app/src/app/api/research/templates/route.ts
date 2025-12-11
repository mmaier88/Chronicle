import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/research/templates - List research templates
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
    const templateType = searchParams.get('type')
    const includePublic = searchParams.get('include_public') !== 'false'

    let query = supabase
      .from('research_templates')
      .select('*')

    if (workspaceId) {
      if (includePublic) {
        query = query.or(`workspace_id.eq.${workspaceId},is_public.eq.true`)
      } else {
        query = query.eq('workspace_id', workspaceId)
      }
    } else if (includePublic) {
      query = query.eq('is_public', true)
    }

    if (templateType) {
      query = query.eq('template_type', templateType)
    }

    const { data: templates, error } = await query.order('use_count', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('List templates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/research/templates - Create a research template
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
      name,
      description,
      template_type,
      structure,
      default_content,
      ai_prompts,
      is_public
    } = body

    if (!name || !template_type || !structure) {
      return NextResponse.json({ error: 'name, template_type, and structure required' }, { status: 400 })
    }

    const { data: template, error } = await supabase
      .from('research_templates')
      .insert({
        workspace_id,
        name,
        description,
        template_type,
        structure,
        default_content: default_content || {},
        ai_prompts: ai_prompts || {},
        is_public: is_public || false,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
