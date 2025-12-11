import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

/**
 * GET /api/research/arguments - List argument maps
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
    const documentId = searchParams.get('document_id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    let query = supabase
      .from('argument_maps')
      .select(`
        *,
        nodes:argument_nodes (count)
      `)
      .eq('workspace_id', workspaceId)

    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    const { data: maps, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ maps })
  } catch (error) {
    console.error('List argument maps error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/research/arguments - Create an argument map
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
      description,
      central_claim,
      auto_generate
    } = body

    if (!workspace_id || !title) {
      return NextResponse.json({ error: 'workspace_id and title required' }, { status: 400 })
    }

    // Create the argument map
    const { data: map, error } = await supabase
      .from('argument_maps')
      .insert({
        workspace_id,
        document_id,
        title,
        description,
        central_claim,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-generate argument structure from document
    if (auto_generate && document_id) {
      const { data: doc } = await supabase
        .from('documents')
        .select('content')
        .eq('id', document_id)
        .single()

      if (doc?.content) {
        // Extract text from Yjs content
        const text = typeof doc.content === 'string'
          ? doc.content
          : JSON.stringify(doc.content).substring(0, 10000)

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [{
            role: 'user',
            content: `Analyze this document and extract its argument structure.

Document content:
${text}

Respond with JSON only:
{
  "central_claim": "Main thesis or argument",
  "nodes": [
    {
      "type": "claim" | "premise" | "evidence" | "counterargument" | "rebuttal" | "conclusion",
      "stance": "pro" | "con" | "neutral",
      "content": "The argument content",
      "strength": 0.0-1.0,
      "parent_index": null | number
    }
  ]
}`
          }]
        })

        const content = response.content[0]
        if (content.type === 'text') {
          try {
            let jsonStr = content.text.trim()
            if (jsonStr.startsWith('```')) {
              jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
            }
            const parsed = JSON.parse(jsonStr)

            // Update central claim if generated
            if (parsed.central_claim && !central_claim) {
              await supabase
                .from('argument_maps')
                .update({ central_claim: parsed.central_claim })
                .eq('id', map.id)
            }

            // Insert nodes
            if (parsed.nodes && Array.isArray(parsed.nodes)) {
              const nodeIds: string[] = []

              for (let i = 0; i < parsed.nodes.length; i++) {
                const node = parsed.nodes[i]
                const { data: insertedNode } = await supabase
                  .from('argument_nodes')
                  .insert({
                    map_id: map.id,
                    parent_id: node.parent_index !== null && node.parent_index !== undefined
                      ? nodeIds[node.parent_index]
                      : null,
                    argument_type: node.type,
                    stance: node.stance,
                    content: node.content,
                    strength: node.strength,
                    position_x: (i % 3) * 200,
                    position_y: Math.floor(i / 3) * 150
                  })
                  .select()
                  .single()

                if (insertedNode) {
                  nodeIds.push(insertedNode.id)
                }
              }
            }
          } catch {
            // Continue without auto-generation
          }
        }
      }
    }

    // Fetch the complete map with nodes
    const { data: completeMap } = await supabase
      .from('argument_maps')
      .select(`
        *,
        nodes:argument_nodes (*)
      `)
      .eq('id', map.id)
      .single()

    return NextResponse.json({ map: completeMap || map }, { status: 201 })
  } catch (error) {
    console.error('Create argument map error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
