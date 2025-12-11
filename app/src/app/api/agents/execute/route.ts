import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface AgentDefinition {
  id: string
  name: string
  agent_type: string
  system_prompt: string
  model: string
  temperature: number
  max_tokens: number
  can_search_sources: boolean
  can_search_entities: boolean
  can_create_entities: boolean
  can_modify_document: boolean
}

interface ReasoningStep {
  step_number: number
  step_type: 'thought' | 'action' | 'observation' | 'conclusion'
  content: string
  sources_consulted: string[]
  entities_referenced: string[]
}

/**
 * POST /api/agents/execute - Execute an agent
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
      agent_id,
      document_id,
      input_data,
      pipeline_id
    } = body

    if (!workspace_id || !agent_id || !input_data) {
      return NextResponse.json({
        error: 'workspace_id, agent_id, and input_data required'
      }, { status: 400 })
    }

    // Get agent definition
    const { data: agent, error: agentError } = await supabase
      .from('agent_definitions')
      .select('*')
      .eq('id', agent_id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const agentDef = agent as AgentDefinition

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('agent_executions')
      .insert({
        workspace_id,
        pipeline_id,
        agent_id,
        document_id,
        input_data,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (execError) {
      return NextResponse.json({ error: execError.message }, { status: 500 })
    }

    try {
      // Build context based on agent capabilities
      let context = ''

      if (agentDef.can_search_sources) {
        const { data: sources } = await supabase
          .from('sources')
          .select('id, title, abstract')
          .eq('workspace_id', workspace_id)
          .limit(20)

        if (sources && sources.length > 0) {
          context += '\n\nAvailable Sources:\n'
          sources.forEach((s, i) => {
            context += `${i + 1}. [${s.id}] ${s.title}\n   ${s.abstract || 'No abstract'}\n`
          })
        }
      }

      if (agentDef.can_search_entities) {
        const { data: entities } = await supabase
          .from('knowledge_entities')
          .select('id, name, entity_type, description')
          .eq('workspace_id', workspace_id)
          .limit(30)

        if (entities && entities.length > 0) {
          context += '\n\nKnowledge Entities:\n'
          entities.forEach((e, i) => {
            context += `${i + 1}. [${e.entity_type}] ${e.name}: ${e.description || 'No description'}\n`
          })
        }
      }

      // Execute agent with reasoning
      const response = await anthropic.messages.create({
        model: agentDef.model,
        max_tokens: agentDef.max_tokens,
        temperature: agentDef.temperature,
        messages: [{
          role: 'user',
          content: `${agentDef.system_prompt}

${context}

Task Input:
${JSON.stringify(input_data, null, 2)}

Respond with JSON containing your reasoning process and final output:
{
  "reasoning": [
    {"step": 1, "type": "thought", "content": "Initial analysis..."},
    {"step": 2, "type": "action", "content": "Searching for..."},
    {"step": 3, "type": "observation", "content": "Found..."},
    {"step": 4, "type": "conclusion", "content": "Therefore..."}
  ],
  "output": {
    "result": "Your main output here",
    "confidence": 0.0-1.0,
    "sources_used": ["source_id1", "source_id2"],
    "entities_referenced": ["entity_id1", "entity_id2"],
    "suggestions": ["Optional follow-up suggestions"]
  }
}`
        }]
      })

      const responseContent = response.content[0]
      if (responseContent.type !== 'text') {
        throw new Error('Invalid response from agent')
      }

      let jsonStr = responseContent.text.trim()
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
      }

      const parsed = JSON.parse(jsonStr)

      // Save reasoning traces
      const reasoningSteps: ReasoningStep[] = (parsed.reasoning || []).map(
        (r: { step: number; type: string; content: string }, i: number) => ({
          step_number: r.step || i + 1,
          step_type: r.type || 'thought',
          content: r.content,
          sources_consulted: [],
          entities_referenced: []
        })
      )

      for (const step of reasoningSteps) {
        await supabase
          .from('reasoning_traces')
          .insert({
            execution_id: execution.id,
            step_number: step.step_number,
            step_type: step.step_type,
            content: step.content,
            sources_consulted: step.sources_consulted,
            entities_referenced: step.entities_referenced,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          })
      }

      // Update execution with results
      const { data: completedExec, error: updateError } = await supabase
        .from('agent_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          output_data: parsed.output,
          confidence: parsed.output?.confidence,
          token_usage: {
            input_tokens: response.usage?.input_tokens,
            output_tokens: response.usage?.output_tokens
          }
        })
        .eq('id', execution.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      // Fetch reasoning traces
      const { data: traces } = await supabase
        .from('reasoning_traces')
        .select('*')
        .eq('execution_id', execution.id)
        .order('step_number', { ascending: true })

      return NextResponse.json({
        execution: completedExec,
        reasoning: traces,
        output: parsed.output
      })
    } catch (execError) {
      // Update execution as failed
      await supabase
        .from('agent_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: execError instanceof Error ? execError.message : 'Unknown error'
        })
        .eq('id', execution.id)

      throw execError
    }
  } catch (error) {
    console.error('Execute agent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
