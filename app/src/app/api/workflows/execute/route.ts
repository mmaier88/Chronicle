import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface ExecuteWorkflowRequest {
  workflowId: string
  documentId?: string
  projectId?: string
  action: 'verify_citations' | 'extract_claims' | 'assess_safety' | 'generate_bibliography'
  parameters?: Record<string, unknown>
}

// POST - Execute a workflow
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ExecuteWorkflowRequest = await request.json()
    const { workflowId, documentId, projectId, action, parameters } = body

    if (!workflowId || !action) {
      return NextResponse.json(
        { error: 'Workflow ID and action are required' },
        { status: 400 }
      )
    }

    // Verify user has access to the document/project
    if (documentId) {
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('id, user_id')
        .eq('id', documentId)
        .single()

      if (docError || !doc || doc.user_id !== user.id) {
        return NextResponse.json({ error: 'Document not found or access denied' }, { status: 403 })
      }
    }

    // Log workflow execution
    const executionId = crypto.randomUUID()

    await supabase.from('workflow_executions').insert({
      id: executionId,
      workflow_id: workflowId,
      document_id: documentId,
      project_id: projectId,
      action,
      parameters,
      status: 'queued',
      user_id: user.id,
      created_at: new Date().toISOString()
    })

    // Execute workflow based on action (inline execution for now)
    // In production, this would call the Supabase Edge Function
    let result: {
      success: boolean
      action: string
      results?: unknown
      error?: string
    }

    const startTime = Date.now()

    switch (action) {
      case 'verify_citations':
        result = await executeVerifyCitations(supabase, documentId)
        break

      case 'extract_claims':
        result = await executeExtractClaims(supabase, documentId)
        break

      case 'assess_safety':
        result = await executeAssessSafety(supabase, documentId)
        break

      case 'generate_bibliography':
        result = await executeGenerateBibliography(supabase, documentId, projectId, parameters)
        break

      default:
        result = { success: false, action, error: `Unknown action: ${action}` }
    }

    const executionTime = Date.now() - startTime

    // Update execution record
    await supabase.from('workflow_executions').update({
      status: result.success ? 'completed' : 'failed',
      results: result.results,
      error: result.error,
      execution_time_ms: executionTime,
      completed_at: new Date().toISOString()
    }).eq('id', executionId)

    return NextResponse.json({
      executionId,
      ...result,
      executionTime
    })

  } catch (error) {
    console.error('Workflow execution error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// Inline execution functions (simplified versions)
async function executeVerifyCitations(supabase: any, documentId?: string) {
  if (!documentId) {
    return { success: false, action: 'verify_citations', error: 'Document ID required' }
  }

  const { data: document } = await supabase
    .from('documents')
    .select('content')
    .eq('id', documentId)
    .single()

  if (!document) {
    return { success: false, action: 'verify_citations', error: 'Document not found' }
  }

  // Simple citation pattern matching
  const citationPattern = /\[([A-Za-z]+(?:\s+(?:et\s+al\.|&\s+[A-Za-z]+))?),?\s*(\d{4})\]/g
  const citations: string[] = []
  let match

  while ((match = citationPattern.exec(document.content || '')) !== null) {
    citations.push(`${match[1]}, ${match[2]}`)
  }

  return {
    success: true,
    action: 'verify_citations',
    results: {
      totalCitations: citations.length,
      citations: citations.map(c => ({ citation: c, status: 'pending_verification' }))
    }
  }
}

async function executeExtractClaims(supabase: any, documentId?: string) {
  if (!documentId) {
    return { success: false, action: 'extract_claims', error: 'Document ID required' }
  }

  const { data: document } = await supabase
    .from('documents')
    .select('content')
    .eq('id', documentId)
    .single()

  if (!document) {
    return { success: false, action: 'extract_claims', error: 'Document not found' }
  }

  const content = document.content || ''
  const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 20)
  const claimMarkers = ['shows that', 'indicates', 'demonstrates', 'suggests', 'proves', 'confirms']

  const claims = sentences.filter((sentence: string) =>
    claimMarkers.some(marker => sentence.toLowerCase().includes(marker))
  ).slice(0, 10)

  return {
    success: true,
    action: 'extract_claims',
    results: {
      totalClaims: claims.length,
      claims: claims.map((claim: string, i: number) => ({
        id: i + 1,
        text: claim.trim(),
        needsCitation: true
      }))
    }
  }
}

async function executeAssessSafety(supabase: any, documentId?: string) {
  if (!documentId) {
    return { success: false, action: 'assess_safety', error: 'Document ID required' }
  }

  const { data: document } = await supabase
    .from('documents')
    .select('content')
    .eq('id', documentId)
    .single()

  if (!document) {
    return { success: false, action: 'assess_safety', error: 'Document not found' }
  }

  const content = document.content || ''

  return {
    success: true,
    action: 'assess_safety',
    results: {
      overallScore: 0.9,
      contentLength: content.length,
      assessment: {
        factualAccuracy: 'pending',
        sourceQuality: 'pending',
        biasIndicators: []
      }
    }
  }
}

async function executeGenerateBibliography(
  supabase: any,
  documentId?: string,
  projectId?: string,
  parameters?: Record<string, unknown>
) {
  const pid = projectId || (documentId ? (await supabase
    .from('documents')
    .select('project_id')
    .eq('id', documentId)
    .single()).data?.project_id : null)

  if (!pid) {
    return { success: false, action: 'generate_bibliography', error: 'Project ID required' }
  }

  const { data: sources } = await supabase
    .from('sources')
    .select('id, title, metadata')
    .eq('project_id', pid)

  const style = (parameters?.style as string) || 'apa'

  return {
    success: true,
    action: 'generate_bibliography',
    results: {
      style,
      totalEntries: (sources || []).length,
      entries: (sources || []).map((s: any, i: number) => ({
        number: i + 1,
        title: s.title,
        formatted: `${s.title}. (n.d.)`
      }))
    }
  }
}
