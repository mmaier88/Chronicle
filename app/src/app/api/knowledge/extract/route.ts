import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface ExtractedEntity {
  name: string
  type: 'person' | 'organization' | 'concept' | 'claim' | 'methodology' | 'finding' | 'dataset' | 'location' | 'event' | 'term' | 'other'
  description?: string
  aliases?: string[]
  confidence: number
  mentions: Array<{
    text: string
    context?: string
    start_offset?: number
    end_offset?: number
  }>
}

interface ExtractedRelationship {
  source_name: string
  target_name: string
  relationship_type: 'supports' | 'contradicts' | 'related_to' | 'derived_from' | 'part_of' | 'authored_by' | 'references' | 'defines' | 'uses' | 'causes' | 'precedes' | 'equivalent_to'
  description?: string
  confidence: number
  evidence_text?: string
}

/**
 * POST /api/knowledge/extract - Extract entities and relationships from document
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { document_id, section_id, content, workspace_id, save_results = true } = body

    if (!content || !workspace_id) {
      return NextResponse.json({ error: 'content and workspace_id required' }, { status: 400 })
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

    // Use AI to extract entities and relationships
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Analyze this research text and extract all meaningful entities and relationships between them.

Text to analyze:
"""
${content}
"""

Extract:
1. **Entities**: People, organizations, concepts, claims, methodologies, findings, datasets, locations, events, and key terms
2. **Relationships**: How entities relate to each other (supports, contradicts, related_to, derived_from, part_of, authored_by, references, defines, uses, causes, precedes, equivalent_to)

Be thorough but precise. Only include entities that are significant to the research content.

Respond with JSON:
{
  "entities": [
    {
      "name": "Entity Name",
      "type": "person|organization|concept|claim|methodology|finding|dataset|location|event|term|other",
      "description": "Brief description of this entity in context",
      "aliases": ["alternative names or abbreviations"],
      "confidence": 0.0-1.0,
      "mentions": [
        {
          "text": "exact text where entity appears",
          "context": "surrounding sentence for context"
        }
      ]
    }
  ],
  "relationships": [
    {
      "source_name": "Entity A",
      "target_name": "Entity B",
      "relationship_type": "supports|contradicts|related_to|derived_from|part_of|authored_by|references|defines|uses|causes|precedes|equivalent_to",
      "description": "How they relate",
      "confidence": 0.0-1.0,
      "evidence_text": "text supporting this relationship"
    }
  ]
}

Only return valid JSON.`,
        },
      ],
    })

    const aiContent = response.content[0]
    if (aiContent.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    let extraction: { entities: ExtractedEntity[]; relationships: ExtractedRelationship[] }
    try {
      let jsonStr = aiContent.text.trim()
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
      extraction = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({
        error: 'Failed to parse AI extraction',
        raw_response: aiContent.text,
      }, { status: 500 })
    }

    // If save_results is true, persist to database
    if (save_results) {
      const entityIdMap = new Map<string, string>()

      // Insert or update entities
      for (const entity of extraction.entities) {
        const normalizedName = entity.name.toLowerCase().trim().replace(/\s+/g, ' ')

        // Check for existing entity
        const { data: existing } = await supabase
          .from('knowledge_entities')
          .select('id')
          .eq('workspace_id', workspace_id)
          .eq('normalized_name', normalizedName)
          .eq('entity_type', entity.type)
          .single()

        let entityId: string

        if (existing) {
          entityId = existing.id
          // Update aliases if new ones found - just update directly
          if (entity.aliases && entity.aliases.length > 0) {
            const { data: currentEntity } = await supabase
              .from('knowledge_entities')
              .select('aliases')
              .eq('id', entityId)
              .single()

            const existingAliases = (currentEntity?.aliases || []) as string[]
            const newAliases = [...new Set([...existingAliases, ...entity.aliases])]

            await supabase
              .from('knowledge_entities')
              .update({ aliases: newAliases })
              .eq('id', entityId)
          }
        } else {
          // Insert new entity
          const { data: newEntity, error: insertError } = await supabase
            .from('knowledge_entities')
            .insert({
              workspace_id,
              name: entity.name,
              normalized_name: normalizedName,
              entity_type: entity.type,
              description: entity.description,
              aliases: entity.aliases || [],
              confidence: entity.confidence,
            })
            .select('id')
            .single()

          if (insertError) {
            console.error('Entity insert error:', insertError)
            continue
          }
          entityId = newEntity.id
        }

        entityIdMap.set(entity.name.toLowerCase(), entityId)

        // Insert mentions
        if (document_id && entity.mentions) {
          // Get branch_id for the document
          const { data: branch } = await supabase
            .from('doc_branches')
            .select('id')
            .eq('document_id', document_id)
            .eq('is_main', true)
            .single()

          if (branch) {
            for (const mention of entity.mentions) {
              await supabase.from('entity_mentions').insert({
                entity_id: entityId,
                document_id,
                branch_id: branch.id,
                section_id: section_id || null,
                mention_text: mention.text,
                context_text: mention.context,
                start_offset: mention.start_offset,
                end_offset: mention.end_offset,
                extraction_method: 'ai',
                confidence: entity.confidence,
              })
            }
          }
        }
      }

      // Insert relationships
      for (const rel of extraction.relationships) {
        const sourceId = entityIdMap.get(rel.source_name.toLowerCase())
        const targetId = entityIdMap.get(rel.target_name.toLowerCase())

        if (sourceId && targetId) {
          await supabase.from('entity_relationships').upsert({
            workspace_id,
            source_entity_id: sourceId,
            target_entity_id: targetId,
            relationship_type: rel.relationship_type,
            description: rel.description,
            confidence: rel.confidence,
            evidence_document_id: document_id || null,
            evidence_text: rel.evidence_text,
          }, {
            onConflict: 'source_entity_id,target_entity_id,relationship_type',
          })
        }
      }
    }

    return NextResponse.json({
      entities: extraction.entities,
      relationships: extraction.relationships,
      saved: save_results,
      entity_count: extraction.entities.length,
      relationship_count: extraction.relationships.length,
    })

  } catch (error) {
    console.error('Entity extraction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
