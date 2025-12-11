import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface DetectedContradiction {
  claim_a: {
    entity_id?: string
    text: string
    document_id?: string
  }
  claim_b: {
    entity_id?: string
    text: string
    document_id?: string
  }
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  analysis: {
    type: string
    explanation: string
    possible_resolutions: string[]
  }
}

/**
 * GET /api/knowledge/contradictions - List contradictions in a workspace
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
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    let query = supabase
      .from('contradictions')
      .select(`
        *,
        claim_a:knowledge_entities!claim_a_entity_id(id, name, entity_type, description),
        claim_b:knowledge_entities!claim_b_entity_id(id, name, entity_type, description),
        document_a:documents!document_a_id(id, title),
        document_b:documents!document_b_id(id, title),
        resolver:auth.users!resolved_by(id, email)
      `, { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    const { data: contradictions, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      contradictions,
      total: count,
      limit,
      offset,
    })

  } catch (error) {
    console.error('List contradictions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/knowledge/contradictions - Detect contradictions between claims
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
      claims, // Array of claim texts to analyze
      entity_ids, // Optional: specific entities to check
      document_ids, // Optional: documents to extract claims from
      save_results = true,
    } = body

    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    // Verify workspace access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Gather claims to analyze
    let claimsToAnalyze: Array<{ id?: string; text: string; document_id?: string }> = []

    if (claims && claims.length > 0) {
      claimsToAnalyze = claims.map((c: string | { text: string }) => typeof c === 'string' ? { text: c } : c)
    }

    if (entity_ids && entity_ids.length > 0) {
      const { data: entities } = await supabase
        .from('knowledge_entities')
        .select('id, name, description')
        .eq('workspace_id', workspace_id)
        .eq('entity_type', 'claim')
        .in('id', entity_ids)

      if (entities) {
        for (const entity of entities) {
          claimsToAnalyze.push({
            id: entity.id,
            text: entity.description || entity.name,
          })
        }
      }
    }

    if (document_ids && document_ids.length > 0) {
      // Get claims from documents
      const { data: mentions } = await supabase
        .from('entity_mentions')
        .select(`
          entity_id,
          document_id,
          context_text,
          entity:knowledge_entities!entity_id(id, name, description, entity_type)
        `)
        .in('document_id', document_ids)

      if (mentions) {
        for (const mention of mentions) {
          // Supabase returns joined data - may be object or array depending on relation
          const entityData = mention.entity as unknown
          const entity = Array.isArray(entityData) ? entityData[0] : entityData
          if (entity && typeof entity === 'object' && 'entity_type' in entity && entity.entity_type === 'claim') {
            const e = entity as { id: string; name: string; description: string | null; entity_type: string }
            claimsToAnalyze.push({
              id: e.id,
              text: mention.context_text || e.description || e.name,
              document_id: mention.document_id,
            })
          }
        }
      }
    }

    if (claimsToAnalyze.length < 2) {
      return NextResponse.json({
        contradictions: [],
        message: 'Need at least 2 claims to detect contradictions'
      })
    }

    // Use AI to detect contradictions
    const claimsText = claimsToAnalyze.map((c, i) => `[${i + 1}] ${c.text}`).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: `Analyze these research claims for contradictions, conflicts, or inconsistencies:

${claimsText}

Identify any pairs of claims that:
1. Directly contradict each other
2. Present conflicting findings
3. Make incompatible assertions
4. Have logical inconsistencies

For each contradiction found, assess:
- Severity: low (minor discrepancy), medium (significant disagreement), high (major conflict), critical (fundamental incompatibility)
- Type of contradiction (direct, implied, methodological, etc.)

Respond with JSON:
{
  "contradictions": [
    {
      "claim_a_index": 1,
      "claim_b_index": 2,
      "description": "Clear description of the contradiction",
      "severity": "low|medium|high|critical",
      "analysis": {
        "type": "type of contradiction",
        "explanation": "detailed explanation",
        "possible_resolutions": ["how this might be resolved"]
      }
    }
  ],
  "summary": "Overall assessment of claim consistency"
}

Return empty contradictions array if no contradictions found.
Only return valid JSON.`,
        },
      ],
    })

    const aiContent = response.content[0]
    if (aiContent.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    let detection: {
      contradictions: Array<{
        claim_a_index: number
        claim_b_index: number
        description: string
        severity: 'low' | 'medium' | 'high' | 'critical'
        analysis: {
          type: string
          explanation: string
          possible_resolutions: string[]
        }
      }>
      summary: string
    }

    try {
      let jsonStr = aiContent.text.trim()
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
      detection = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({
        error: 'Failed to parse AI detection',
        raw_response: aiContent.text,
      }, { status: 500 })
    }

    // Map detected contradictions back to claims
    const detectedContradictions: DetectedContradiction[] = detection.contradictions.map(c => ({
      claim_a: {
        entity_id: claimsToAnalyze[c.claim_a_index - 1]?.id,
        text: claimsToAnalyze[c.claim_a_index - 1]?.text || '',
        document_id: claimsToAnalyze[c.claim_a_index - 1]?.document_id,
      },
      claim_b: {
        entity_id: claimsToAnalyze[c.claim_b_index - 1]?.id,
        text: claimsToAnalyze[c.claim_b_index - 1]?.text || '',
        document_id: claimsToAnalyze[c.claim_b_index - 1]?.document_id,
      },
      description: c.description,
      severity: c.severity,
      analysis: c.analysis,
    }))

    // Save to database if requested
    if (save_results && detectedContradictions.length > 0) {
      for (const contradiction of detectedContradictions) {
        // Only save if we have entity IDs for both claims
        if (contradiction.claim_a.entity_id && contradiction.claim_b.entity_id) {
          await supabase.from('contradictions').insert({
            workspace_id,
            claim_a_entity_id: contradiction.claim_a.entity_id,
            claim_b_entity_id: contradiction.claim_b.entity_id,
            description: contradiction.description,
            severity: contradiction.severity,
            status: 'detected',
            document_a_id: contradiction.claim_a.document_id || null,
            document_b_id: contradiction.claim_b.document_id || null,
            analysis: contradiction.analysis,
            resolution_suggestion: contradiction.analysis.possible_resolutions?.join('; '),
          })
        }
      }
    }

    return NextResponse.json({
      contradictions: detectedContradictions,
      summary: detection.summary,
      saved: save_results && detectedContradictions.some(c => c.claim_a.entity_id && c.claim_b.entity_id),
    })

  } catch (error) {
    console.error('Contradiction detection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/knowledge/contradictions - Update contradiction status
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contradiction_id, status, resolution_notes } = body

    if (!contradiction_id) {
      return NextResponse.json({ error: 'contradiction_id required' }, { status: 400 })
    }

    // Get contradiction to check workspace
    const { data: contradiction } = await supabase
      .from('contradictions')
      .select('workspace_id')
      .eq('id', contradiction_id)
      .single()

    if (!contradiction) {
      return NextResponse.json({ error: 'Contradiction not found' }, { status: 404 })
    }

    // Verify workspace access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', contradiction.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if (status) updates.status = status
    if (resolution_notes) updates.resolution_notes = resolution_notes

    if (status === 'resolved' || status === 'dismissed') {
      updates.resolved_by = user.id
      updates.resolved_at = new Date().toISOString()
    }

    const { data: updated, error } = await supabase
      .from('contradictions')
      .update(updates)
      .eq('id', contradiction_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contradiction: updated })

  } catch (error) {
    console.error('Update contradiction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
