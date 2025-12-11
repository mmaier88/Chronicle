import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/agents/executions/[id] - Get execution with reasoning traces
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

    // Get execution
    const { data: execution, error: execError } = await supabase
      .from('agent_executions')
      .select(`
        *,
        agent:agent_definitions (id, name, agent_type, description),
        pipeline:agent_pipelines (id, name)
      `)
      .eq('id', id)
      .single()

    if (execError) {
      return NextResponse.json({ error: execError.message }, { status: 404 })
    }

    // Get reasoning traces
    const { data: traces, error: tracesError } = await supabase
      .from('reasoning_traces')
      .select('*')
      .eq('execution_id', id)
      .order('step_number', { ascending: true })

    if (tracesError) {
      return NextResponse.json({ error: tracesError.message }, { status: 500 })
    }

    return NextResponse.json({
      execution,
      reasoning: traces
    })
  } catch (error) {
    console.error('Get execution error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/agents/executions/[id] - Cancel a running execution
 */
export async function DELETE(
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

    // Only cancel running executions
    const { data: execution, error: updateError } = await supabase
      .from('agent_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'Cancelled by user'
      })
      .eq('id', id)
      .eq('status', 'running')
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Execution not found or not running' }, { status: 404 })
    }

    return NextResponse.json({ execution })
  } catch (error) {
    console.error('Cancel execution error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
