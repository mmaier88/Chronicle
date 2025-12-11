import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface MergeConflict {
  section_index: number
  source_content: string | null
  target_content: string | null
  conflict_type: 'both_modified' | 'deleted_modified'
  resolution?: 'keep_source' | 'keep_target' | 'merge' | 'custom'
  merged_content?: string
}

/**
 * POST /api/documents/[id]/branches/[branchId]/merge - Merge branch into target
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const { id, branchId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      target_branch_id,
      resolutions = [], // Array of conflict resolutions
      auto_merge = false,
      merge_message,
    } = body

    if (!target_branch_id) {
      return NextResponse.json({ error: 'target_branch_id required' }, { status: 400 })
    }

    // Get source branch (the one being merged)
    const { data: sourceBranch } = await supabase
      .from('doc_branches')
      .select('*')
      .eq('id', branchId)
      .eq('document_id', id)
      .single()

    if (!sourceBranch) {
      return NextResponse.json({ error: 'Source branch not found' }, { status: 404 })
    }

    // Get target branch
    const { data: targetBranch } = await supabase
      .from('doc_branches')
      .select('*')
      .eq('id', target_branch_id)
      .eq('document_id', id)
      .single()

    if (!targetBranch) {
      return NextResponse.json({ error: 'Target branch not found' }, { status: 404 })
    }

    // Get sections from both branches
    const { data: sourceSections } = await supabase
      .from('doc_sections')
      .select('*')
      .eq('branch_id', branchId)
      .order('order_index')

    const { data: targetSections } = await supabase
      .from('doc_sections')
      .select('*')
      .eq('branch_id', target_branch_id)
      .order('order_index')

    const targetMap = new Map(targetSections?.map(s => [s.order_index, s]) || [])
    const sourceMap = new Map(sourceSections?.map(s => [s.order_index, s]) || [])

    // Detect conflicts
    const conflicts: MergeConflict[] = []

    for (const [index, sourceSection] of sourceMap) {
      const targetSection = targetMap.get(index)

      if (targetSection) {
        // Both have this section - check if both modified from parent
        if (sourceSection.content_text !== targetSection.content_text) {
          conflicts.push({
            section_index: index,
            source_content: sourceSection.content_text,
            target_content: targetSection.content_text,
            conflict_type: 'both_modified',
          })
        }
      }
    }

    // If there are unresolved conflicts and not auto_merge, return conflicts
    if (conflicts.length > 0 && !auto_merge && resolutions.length === 0) {
      return NextResponse.json({
        status: 'conflicts',
        conflicts,
        message: 'Conflicts detected. Please provide resolutions.',
      })
    }

    // Apply resolutions or auto-merge
    interface Resolution {
      section_index: number
      resolution: string
      merged_content?: string
    }
    const resolutionMap = new Map<number, Resolution>(
      resolutions.map((r: Resolution) => [r.section_index, r])
    )

    const mergedSections: Array<{
      order_index: number
      title: string | null
      content_json: unknown
      content_text: string | null
    }> = []

    // Get all unique indices
    const allIndices = new Set([...sourceMap.keys(), ...targetMap.keys()])

    for (const index of Array.from(allIndices).sort((a, b) => a - b)) {
      const sourceSection = sourceMap.get(index)
      const targetSection = targetMap.get(index)
      const resolution = resolutionMap.get(index)

      if (sourceSection && !targetSection) {
        // Added in source - include it
        mergedSections.push({
          order_index: index,
          title: sourceSection.title,
          content_json: sourceSection.content_json,
          content_text: sourceSection.content_text,
        })
      } else if (!sourceSection && targetSection) {
        // Only in target - keep it (unless explicitly removed)
        mergedSections.push({
          order_index: index,
          title: targetSection.title,
          content_json: targetSection.content_json,
          content_text: targetSection.content_text,
        })
      } else if (sourceSection && targetSection) {
        // Both exist
        if (sourceSection.content_text === targetSection.content_text) {
          // No conflict - keep either
          mergedSections.push({
            order_index: index,
            title: sourceSection.title,
            content_json: sourceSection.content_json,
            content_text: sourceSection.content_text,
          })
        } else if (resolution) {
          // Apply resolution
          if (resolution.resolution === 'keep_source') {
            mergedSections.push({
              order_index: index,
              title: sourceSection.title,
              content_json: sourceSection.content_json,
              content_text: sourceSection.content_text,
            })
          } else if (resolution.resolution === 'keep_target') {
            mergedSections.push({
              order_index: index,
              title: targetSection.title,
              content_json: targetSection.content_json,
              content_text: targetSection.content_text,
            })
          } else if (resolution.resolution === 'custom' && resolution.merged_content) {
            mergedSections.push({
              order_index: index,
              title: sourceSection.title,
              content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: resolution.merged_content }] }] },
              content_text: resolution.merged_content,
            })
          }
        } else if (auto_merge) {
          // Auto-merge: prefer source (the branch being merged in)
          mergedSections.push({
            order_index: index,
            title: sourceSection.title,
            content_json: sourceSection.content_json,
            content_text: sourceSection.content_text,
          })
        } else {
          // Unresolved conflict
          return NextResponse.json({
            status: 'conflicts',
            conflicts: [{ section_index: index, source_content: sourceSection.content_text, target_content: targetSection.content_text, conflict_type: 'both_modified' }],
            message: `Unresolved conflict at section ${index}`,
          })
        }
      }
    }

    // Apply the merge - update target branch sections
    // First, delete existing sections
    await supabase
      .from('doc_sections')
      .delete()
      .eq('branch_id', target_branch_id)

    // Insert merged sections
    if (mergedSections.length > 0) {
      const sectionsToInsert = mergedSections.map(s => ({
        document_id: id,
        branch_id: target_branch_id,
        order_index: s.order_index,
        title: s.title,
        content_json: s.content_json,
        content_text: s.content_text,
      }))

      await supabase.from('doc_sections').insert(sectionsToInsert)
    }

    // Mark source branch as merged
    await supabase
      .from('doc_branches')
      .update({
        merged_at: new Date().toISOString(),
        merged_by: user.id,
      })
      .eq('id', branchId)

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'document.branch_merge',
      p_document_id: id,
      p_target_type: 'branch',
      p_target_id: branchId,
      p_details: {
        source_branch: sourceBranch.name,
        target_branch: targetBranch.name,
        sections_merged: mergedSections.length,
        conflicts_resolved: resolutions.length,
        message: merge_message,
      },
    })

    return NextResponse.json({
      status: 'merged',
      message: `Successfully merged "${sourceBranch.name}" into "${targetBranch.name}"`,
      sections_merged: mergedSections.length,
    })

  } catch (error) {
    console.error('Merge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/documents/[id]/branches/[branchId]/merge - AI-assisted merge
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const { id, branchId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { source_content, target_content, context } = body

    if (!source_content || !target_content) {
      return NextResponse.json({ error: 'source_content and target_content required' }, { status: 400 })
    }

    // Use AI to suggest a merge
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are helping merge two versions of a document section. Create a merged version that incorporates the best of both while maintaining coherence.

${context ? `Context: ${context}\n\n` : ''}
Version A (source branch):
"""
${source_content}
"""

Version B (target branch):
"""
${target_content}
"""

Create a merged version that:
1. Preserves all important information from both versions
2. Resolves any contradictions intelligently
3. Maintains a coherent narrative flow
4. Does not duplicate content

Respond with JSON:
{
  "merged_content": "the merged text",
  "changes_from_source": ["what was kept/changed from source"],
  "changes_from_target": ["what was kept/changed from target"],
  "reasoning": "brief explanation of merge decisions"
}

Only return valid JSON.`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    let suggestion
    try {
      let jsonStr = content.text.trim()
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
      suggestion = JSON.parse(jsonStr)
    } catch {
      suggestion = {
        merged_content: source_content,
        changes_from_source: ['Using source as fallback'],
        changes_from_target: [],
        reasoning: 'Failed to generate merge suggestion',
      }
    }

    return NextResponse.json({ suggestion })

  } catch (error) {
    console.error('AI merge suggestion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
