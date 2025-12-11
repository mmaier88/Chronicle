import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface SectionDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  order_index: number
  source_section?: {
    id: string
    title: string | null
    content_text: string | null
  }
  target_section?: {
    id: string
    title: string | null
    content_text: string | null
  }
  changes?: string[] // List of specific changes for modified sections
}

/**
 * GET /api/documents/[id]/branches/[branchId]/diff?compare_to=<branchId>
 * Compare two branches
 */
export async function GET(
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

    const { searchParams } = new URL(request.url)
    const compareToBranchId = searchParams.get('compare_to')

    if (!compareToBranchId) {
      return NextResponse.json({ error: 'compare_to parameter required' }, { status: 400 })
    }

    // Get sections from source branch (the one being compared)
    const { data: sourceSections, error: sourceError } = await supabase
      .from('doc_sections')
      .select('id, order_index, title, content_text, content_json')
      .eq('branch_id', branchId)
      .order('order_index')

    if (sourceError) {
      return NextResponse.json({ error: 'Failed to fetch source branch' }, { status: 500 })
    }

    // Get sections from target branch (the one we're comparing to)
    const { data: targetSections, error: targetError } = await supabase
      .from('doc_sections')
      .select('id, order_index, title, content_text, content_json')
      .eq('branch_id', compareToBranchId)
      .order('order_index')

    if (targetError) {
      return NextResponse.json({ error: 'Failed to fetch target branch' }, { status: 500 })
    }

    // Build diff
    const diffs: SectionDiff[] = []
    const targetMap = new Map(targetSections?.map(s => [s.order_index, s]) || [])
    const sourceMap = new Map(sourceSections?.map(s => [s.order_index, s]) || [])

    // Find all unique order indices
    const allIndices = new Set([
      ...(sourceSections?.map(s => s.order_index) || []),
      ...(targetSections?.map(s => s.order_index) || []),
    ])

    for (const index of Array.from(allIndices).sort((a, b) => a - b)) {
      const sourceSection = sourceMap.get(index)
      const targetSection = targetMap.get(index)

      if (sourceSection && !targetSection) {
        // Section added in source
        diffs.push({
          type: 'added',
          order_index: index,
          source_section: {
            id: sourceSection.id,
            title: sourceSection.title,
            content_text: sourceSection.content_text,
          },
        })
      } else if (!sourceSection && targetSection) {
        // Section removed in source (exists in target)
        diffs.push({
          type: 'removed',
          order_index: index,
          target_section: {
            id: targetSection.id,
            title: targetSection.title,
            content_text: targetSection.content_text,
          },
        })
      } else if (sourceSection && targetSection) {
        // Both exist - check if modified
        const contentChanged = sourceSection.content_text !== targetSection.content_text
        const titleChanged = sourceSection.title !== targetSection.title

        if (contentChanged || titleChanged) {
          diffs.push({
            type: 'modified',
            order_index: index,
            source_section: {
              id: sourceSection.id,
              title: sourceSection.title,
              content_text: sourceSection.content_text,
            },
            target_section: {
              id: targetSection.id,
              title: targetSection.title,
              content_text: targetSection.content_text,
            },
            changes: [
              ...(titleChanged ? ['Title changed'] : []),
              ...(contentChanged ? ['Content modified'] : []),
            ],
          })
        } else {
          diffs.push({
            type: 'unchanged',
            order_index: index,
            source_section: {
              id: sourceSection.id,
              title: sourceSection.title,
              content_text: sourceSection.content_text,
            },
          })
        }
      }
    }

    // Summary statistics
    const summary = {
      total_sections: diffs.length,
      added: diffs.filter(d => d.type === 'added').length,
      removed: diffs.filter(d => d.type === 'removed').length,
      modified: diffs.filter(d => d.type === 'modified').length,
      unchanged: diffs.filter(d => d.type === 'unchanged').length,
    }

    return NextResponse.json({
      source_branch_id: branchId,
      target_branch_id: compareToBranchId,
      diffs,
      summary,
    })

  } catch (error) {
    console.error('Branch diff error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents/[id]/branches/[branchId]/diff - Get AI-powered diff analysis
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
    const { compare_to: compareToBranchId, section_index } = body

    if (!compareToBranchId) {
      return NextResponse.json({ error: 'compare_to required' }, { status: 400 })
    }

    // Get specific sections to compare
    const { data: sourceSection } = await supabase
      .from('doc_sections')
      .select('content_text, title')
      .eq('branch_id', branchId)
      .eq('order_index', section_index)
      .single()

    const { data: targetSection } = await supabase
      .from('doc_sections')
      .select('content_text, title')
      .eq('branch_id', compareToBranchId)
      .eq('order_index', section_index)
      .single()

    if (!sourceSection && !targetSection) {
      return NextResponse.json({ error: 'Sections not found' }, { status: 404 })
    }

    // Use AI to analyze the diff
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Compare these two versions of a document section and provide a detailed analysis of the changes.

Original version:
"""
${targetSection?.content_text || '(Section does not exist)'}
"""

Modified version:
"""
${sourceSection?.content_text || '(Section deleted)'}
"""

Provide a JSON response:
{
  "summary": "Brief summary of what changed",
  "change_type": "addition" | "deletion" | "revision" | "restructure" | "minor_edit",
  "semantic_changes": [
    {"type": "meaning_changed" | "tone_changed" | "detail_added" | "detail_removed" | "reorganized", "description": "what changed"}
  ],
  "additions": ["list of added content/ideas"],
  "deletions": ["list of removed content/ideas"],
  "suggestions": ["any suggestions for improving the merge"]
}

Only return valid JSON.`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    let analysis
    try {
      let jsonStr = content.text.trim()
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
      analysis = JSON.parse(jsonStr)
    } catch {
      analysis = {
        summary: 'Unable to analyze changes',
        change_type: 'revision',
        semantic_changes: [],
        additions: [],
        deletions: [],
        suggestions: [],
      }
    }

    return NextResponse.json({
      section_index,
      source_text: sourceSection?.content_text,
      target_text: targetSection?.content_text,
      analysis,
    })

  } catch (error) {
    console.error('AI diff analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
