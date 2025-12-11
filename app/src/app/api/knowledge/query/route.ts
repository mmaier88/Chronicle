import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

/**
 * POST /api/knowledge/query - Natural language queries over knowledge graph
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspace_id, query } = body

    if (!workspace_id || !query) {
      return NextResponse.json({ error: 'workspace_id and query required' }, { status: 400 })
    }

    // Verify workspace access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Get knowledge graph context
    const { data: entities } = await supabase
      .from('knowledge_entities')
      .select('id, name, entity_type, description')
      .eq('workspace_id', workspace_id)
      .limit(100)

    const { data: relationships } = await supabase
      .from('entity_relationships')
      .select(`
        source_entity_id,
        target_entity_id,
        relationship_type,
        description,
        source:knowledge_entities!source_entity_id(name),
        target:knowledge_entities!target_entity_id(name)
      `)
      .eq('workspace_id', workspace_id)
      .limit(200)

    const { data: contradictions } = await supabase
      .from('contradictions')
      .select(`
        description,
        severity,
        status,
        claim_a:knowledge_entities!claim_a_entity_id(name),
        claim_b:knowledge_entities!claim_b_entity_id(name)
      `)
      .eq('workspace_id', workspace_id)
      .eq('status', 'detected')
      .limit(20)

    // Build context for AI
    const entitiesContext = entities?.map(e =>
      `- ${e.name} (${e.entity_type}): ${e.description || 'No description'}`
    ).join('\n') || 'No entities found'

    const relationshipsContext = relationships?.map(r => {
      const sourceName = Array.isArray(r.source) ? r.source[0]?.name : (r.source as { name: string } | null)?.name
      const targetName = Array.isArray(r.target) ? r.target[0]?.name : (r.target as { name: string } | null)?.name
      return `- ${sourceName} ${r.relationship_type} ${targetName}${r.description ? `: ${r.description}` : ''}`
    }).join('\n') || 'No relationships found'

    const contradictionsContext = contradictions?.map(c => {
      const claimAName = Array.isArray(c.claim_a) ? c.claim_a[0]?.name : (c.claim_a as { name: string } | null)?.name
      const claimBName = Array.isArray(c.claim_b) ? c.claim_b[0]?.name : (c.claim_b as { name: string } | null)?.name
      return `- [${c.severity}] ${claimAName} vs ${claimBName}: ${c.description}`
    }).join('\n') || 'No contradictions detected'

    // Query the AI
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are a research assistant with access to a knowledge graph. Answer the user's question based on the following knowledge:

ENTITIES:
${entitiesContext}

RELATIONSHIPS:
${relationshipsContext}

DETECTED CONTRADICTIONS:
${contradictionsContext}

USER QUESTION: ${query}

Provide a clear, structured answer based on the knowledge graph data. If the information needed isn't in the knowledge graph, say so. Include specific entity names and relationships in your answer.

Format your response as JSON:
{
  "answer": "Your detailed answer here",
  "relevant_entities": ["Entity names that are relevant to the answer"],
  "relevant_relationships": ["Relationship descriptions relevant to the answer"],
  "contradictions_noted": ["Any contradictions that affect this answer"],
  "confidence": "high" | "medium" | "low",
  "gaps": ["Information gaps that would improve the answer"]
}

Only return valid JSON.`,
        },
      ],
    })

    const aiContent = response.content[0]
    if (aiContent.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    let result
    try {
      let jsonStr = aiContent.text.trim()
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
      result = JSON.parse(jsonStr)
    } catch {
      result = {
        answer: aiContent.text,
        relevant_entities: [],
        relevant_relationships: [],
        contradictions_noted: [],
        confidence: 'low',
        gaps: ['Failed to parse structured response'],
      }
    }

    // Find entity IDs for relevant entities
    const relevantEntityIds = entities
      ?.filter(e => result.relevant_entities?.includes(e.name))
      .map(e => e.id) || []

    return NextResponse.json({
      query,
      result,
      relevant_entity_ids: relevantEntityIds,
      context_size: {
        entities: entities?.length || 0,
        relationships: relationships?.length || 0,
        contradictions: contradictions?.length || 0,
      },
    })

  } catch (error) {
    console.error('Knowledge query error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
