import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export interface Workflow {
  id: string
  projectId: string
  workflowType: string
  name: string
  description: string
  schedule: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
}

const AVAILABLE_WORKFLOWS = [
  {
    type: 'daily_index_refresh',
    name: 'Daily Index Refresh',
    description: 'Re-embed updated document sections to keep search fresh',
    schedule: 'daily',
    defaultEnabled: false
  },
  {
    type: 'weekly_exec_summary',
    name: 'Weekly Executive Summary',
    description: 'Generate a summary of project progress and key findings',
    schedule: 'weekly',
    defaultEnabled: false
  },
  {
    type: 'weekly_inconsistency_scan',
    name: 'Weekly Inconsistency Scan',
    description: 'Find contradictions and inconsistencies across documents',
    schedule: 'weekly',
    defaultEnabled: false
  },
  {
    type: 'weekly_citation_check',
    name: 'Weekly Citation Check',
    description: 'Verify all citations are still supported by sources',
    schedule: 'weekly',
    defaultEnabled: false
  },
  {
    type: 'weekly_risk_assessment',
    name: 'Weekly Risk Assessment',
    description: 'Update safety scores for all documents',
    schedule: 'weekly',
    defaultEnabled: false
  }
]

// GET - List workflows for a project
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = request.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      // Return available workflow types
      return NextResponse.json({ workflows: AVAILABLE_WORKFLOWS })
    }

    // SECURITY: Verify user has access to this project's workspace
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get project workflows from database
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('project_id', projectId)

    if (error) {
      console.error('Error fetching workflows:', error)
      return NextResponse.json({
        error: 'Failed to fetch workflows'
      }, { status: 500 })
    }

    // Merge with available workflows to show all options
    const mergedWorkflows = AVAILABLE_WORKFLOWS.map(available => {
      const existing = workflows?.find(w => w.workflow_type === available.type)
      return {
        id: existing?.id || `${projectId}-${available.type}`,
        projectId,
        workflowType: available.type,
        name: available.name,
        description: available.description,
        schedule: available.schedule,
        enabled: existing?.enabled || false,
        lastRun: existing?.last_run_at,
        nextRun: existing?.next_run_at
      }
    })

    return NextResponse.json({ workflows: mergedWorkflows })

  } catch (error) {
    console.error('Workflows GET error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Create or update a workflow
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, workflowType, enabled } = body

    if (!projectId || !workflowType) {
      return NextResponse.json({
        error: 'projectId and workflowType are required'
      }, { status: 400 })
    }

    // Validate workflow type
    const workflowDef = AVAILABLE_WORKFLOWS.find(w => w.type === workflowType)
    if (!workflowDef) {
      return NextResponse.json({
        error: 'Invalid workflow type'
      }, { status: 400 })
    }

    // Upsert workflow
    const { data: workflow, error } = await supabase
      .from('workflows')
      .upsert({
        project_id: projectId,
        workflow_type: workflowType,
        enabled: enabled ?? false,
        schedule: workflowDef.schedule,
        config: {}
      }, {
        onConflict: 'project_id,workflow_type'
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting workflow:', error)
      return NextResponse.json({
        error: 'Failed to save workflow'
      }, { status: 500 })
    }

    return NextResponse.json({
      workflow: {
        id: workflow.id,
        projectId: workflow.project_id,
        workflowType: workflow.workflow_type,
        name: workflowDef.name,
        description: workflowDef.description,
        schedule: workflow.schedule,
        enabled: workflow.enabled,
        lastRun: workflow.last_run_at,
        nextRun: workflow.next_run_at
      }
    })

  } catch (error) {
    console.error('Workflows POST error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
