import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/anthropic'
import { NextRequest, NextResponse } from 'next/server'

export interface Claim {
  id: string
  type: 'claim' | 'assumption' | 'definition' | 'evidence'
  text: string
  confidence: number
  startOffset?: number
  endOffset?: number
}

export interface ClaimLink {
  sourceId: string
  targetId: string
  relationship: 'supports' | 'contradicts' | 'depends_on' | 'refines' | 'exemplifies'
  strength: number
}

export interface ClaimGraph {
  claims: Claim[]
  links: ClaimLink[]
  summary: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, documentId } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // SECURITY: If documentId is provided, verify user has access to its workspace
    if (documentId) {
      const { data: doc } = await supabase
        .from('documents')
        .select('id, projects!inner(workspace_id)')
        .eq('id', documentId)
        .single()

      if (!doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      const projects = doc.projects as unknown as { workspace_id: string } | { workspace_id: string }[]
      const workspaceId = Array.isArray(projects) ? projects[0]?.workspace_id : projects?.workspace_id

      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Strip HTML tags for analysis
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    if (plainText.length < 50) {
      return NextResponse.json({
        graph: {
          claims: [],
          links: [],
          summary: 'Not enough content to extract claims.'
        }
      })
    }

    const anthropic = getAnthropicClient()

    if (!anthropic) {
      return NextResponse.json({
        error: 'Claim extraction requires ANTHROPIC_API_KEY to be configured.'
      }, { status: 500 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are an expert at analyzing academic and research texts. Extract the logical structure of arguments from the text.

For each piece of content, identify:
1. **Claims**: Main assertions or arguments being made
2. **Assumptions**: Unstated premises the argument relies on
3. **Definitions**: Key terms being defined or used with specific meaning
4. **Evidence**: Facts, data, or citations supporting claims

Also identify relationships between these elements:
- supports: one element provides evidence for another
- contradicts: elements are in tension or conflict
- depends_on: one element requires another to be true
- refines: one element adds nuance to another
- exemplifies: one element is an example of another

Respond with a JSON object:
{
  "claims": [
    {"id": "c1", "type": "claim|assumption|definition|evidence", "text": "...", "confidence": 0.0-1.0}
  ],
  "links": [
    {"sourceId": "c1", "targetId": "c2", "relationship": "supports|contradicts|depends_on|refines|exemplifies", "strength": 0.0-1.0}
  ],
  "summary": "Brief summary of the argument structure"
}

Be thorough but focused. Extract 5-15 key elements. Only output the JSON.`,
      messages: [
        {
          role: 'user',
          content: `Analyze the following text and extract its argument structure:\n\n${plainText.substring(0, 8000)}`
        }
      ]
    })

    const textContent = response.content.find(c => c.type === 'text')

    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from analysis' }, { status: 500 })
    }

    try {
      const graph: ClaimGraph = JSON.parse(textContent.text)

      // Store claims in database if documentId provided
      if (documentId) {
        try {
          // Clear existing claims for this document
          await supabase
            .from('claims')
            .delete()
            .eq('document_id', documentId)

          // Insert new claims
          if (graph.claims.length > 0) {
            const claimRecords = graph.claims.map(claim => ({
              id: claim.id.startsWith('c') ? undefined : claim.id, // Let DB generate ID
              document_id: documentId,
              claim_type: claim.type,
              text: claim.text,
              confidence: claim.confidence,
              metadata: { originalId: claim.id }
            }))

            const { data: insertedClaims, error: insertError } = await supabase
              .from('claims')
              .insert(claimRecords)
              .select('id, metadata')

            if (!insertError && insertedClaims) {
              // Create ID mapping
              const idMap = new Map<string, string>()
              insertedClaims.forEach(c => {
                if (c.metadata?.originalId) {
                  idMap.set(c.metadata.originalId, c.id)
                }
              })

              // Insert links with mapped IDs
              if (graph.links.length > 0) {
                const linkRecords = graph.links
                  .filter(link => idMap.has(link.sourceId) && idMap.has(link.targetId))
                  .map(link => ({
                    source_claim_id: idMap.get(link.sourceId),
                    target_claim_id: idMap.get(link.targetId),
                    link_type: link.relationship,
                    strength: link.strength
                  }))

                if (linkRecords.length > 0) {
                  await supabase.from('claim_links').insert(linkRecords)
                }
              }
            }
          }
        } catch (dbError) {
          console.warn('Failed to store claims in database:', dbError)
        }
      }

      return NextResponse.json({ graph })

    } catch (parseError) {
      console.error('Error parsing claim extraction response:', parseError)
      return NextResponse.json({
        error: 'Failed to parse analysis results'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Claim extraction error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
