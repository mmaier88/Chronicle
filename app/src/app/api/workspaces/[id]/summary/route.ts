import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

/**
 * GET /api/workspaces/[id]/summary - Get workspace summary (latest or by period)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify workspace access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const summaryType = searchParams.get('type') || 'weekly'

    // Get latest summary of this type
    const { data: summary } = await supabase
      .from('workspace_summaries')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('summary_type', summaryType)
      .order('period_end', { ascending: false })
      .limit(1)
      .single()

    if (summary) {
      return NextResponse.json({ summary })
    }

    return NextResponse.json({ summary: null, message: 'No summary available yet' })

  } catch (error) {
    console.error('Get summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/workspaces/[id]/summary - Generate workspace summary
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify workspace access (admin/owner only)
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { summary_type = 'weekly', days = 7 } = body

    const periodEnd = new Date()
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - days)

    // Gather workspace data for the period
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single()

    // New documents
    const { data: newDocs, count: docCount } = await supabase
      .from('documents')
      .select('id, title', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .gte('created_at', periodStart.toISOString())
      .limit(20)

    // New sources
    const { data: newSources, count: sourceCount } = await supabase
      .from('sources')
      .select('id, title', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .gte('created_at', periodStart.toISOString())
      .limit(20)

    // New entities
    const { data: newEntities, count: entityCount } = await supabase
      .from('knowledge_entities')
      .select('id, name, entity_type', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .gte('created_at', periodStart.toISOString())
      .limit(30)

    // Contradictions
    const { data: contradictions, count: contradictionCount } = await supabase
      .from('contradictions')
      .select('id, description, severity', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .gte('created_at', periodStart.toISOString())

    // Active users
    const { data: activeMembers } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)

    // Recent claims/findings
    const { data: recentClaims } = await supabase
      .from('knowledge_entities')
      .select('name, description')
      .eq('workspace_id', workspaceId)
      .in('entity_type', ['claim', 'finding'])
      .gte('created_at', periodStart.toISOString())
      .limit(10)

    // Build context for AI summary
    const documentsContext = newDocs?.map(d => `- ${d.title}`).join('\n') || 'None'
    const sourcesContext = newSources?.map(s => `- ${s.title}`).join('\n') || 'None'
    const entitiesContext = newEntities?.map(e => `- ${e.name} (${e.entity_type})`).join('\n') || 'None'
    const claimsContext = recentClaims?.map(c => `- ${c.name}: ${c.description || 'No description'}`).join('\n') || 'None'
    const contradictionsContext = contradictions?.map(c => `- [${c.severity}] ${c.description}`).join('\n') || 'None'

    // Generate AI summary
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Generate a research workspace summary for the past ${days} days.

Workspace: ${workspace?.name || 'Research Workspace'}

NEW DOCUMENTS (${docCount || 0}):
${documentsContext}

NEW SOURCES (${sourceCount || 0}):
${sourcesContext}

NEW KNOWLEDGE ENTITIES (${entityCount || 0}):
${entitiesContext}

RECENT CLAIMS & FINDINGS:
${claimsContext}

NEW CONTRADICTIONS (${contradictionCount || 0}):
${contradictionsContext}

Provide a JSON response:
{
  "summary_text": "Executive summary paragraph (2-4 sentences)",
  "key_findings": ["List of key findings/progress points"],
  "trends": ["Notable trends or patterns observed"],
  "recommendations": ["Suggested next steps or areas to focus on"],
  "highlights": {
    "most_significant_document": "Title if any",
    "emerging_themes": ["Themes appearing across documents"],
    "attention_needed": ["Areas that may need attention"]
  }
}

Only return valid JSON.`,
        },
      ],
    })

    const aiContent = response.content[0]
    if (aiContent.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    let aiSummary
    try {
      let jsonStr = aiContent.text.trim()
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
      aiSummary = JSON.parse(jsonStr)
    } catch {
      aiSummary = {
        summary_text: `This week saw ${docCount || 0} new documents, ${sourceCount || 0} sources, and ${entityCount || 0} knowledge entities added to the workspace.`,
        key_findings: [],
        trends: [],
        recommendations: [],
      }
    }

    // Store summary
    const { data: summary, error } = await supabase
      .from('workspace_summaries')
      .insert({
        workspace_id: workspaceId,
        summary_type,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        summary_text: aiSummary.summary_text,
        key_findings: aiSummary.key_findings || [],
        new_documents: docCount || 0,
        new_sources: sourceCount || 0,
        new_entities: entityCount || 0,
        new_contradictions: contradictionCount || 0,
        active_users: activeMembers?.map(m => m.user_id) || [],
        trends: aiSummary.trends || [],
        recommendations: aiSummary.recommendations || [],
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ summary, ai_analysis: aiSummary }, { status: 201 })

  } catch (error) {
    console.error('Generate summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
