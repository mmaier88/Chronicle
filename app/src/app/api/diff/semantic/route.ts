import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/anthropic'
import { NextRequest, NextResponse } from 'next/server'

export interface SemanticChange {
  type: 'added' | 'removed' | 'modified' | 'strengthened' | 'weakened'
  category: 'claim' | 'argument' | 'evidence' | 'structure' | 'tone'
  description: string
  importance: 'high' | 'medium' | 'low'
  beforeText?: string
  afterText?: string
}

export interface SemanticDiff {
  changes: SemanticChange[]
  summary: string
  overallAssessment: string
  claimsAdded: number
  claimsRemoved: number
  claimsModified: number
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
    const { beforeContent, afterContent, documentId, branchA, branchB } = body

    if (!beforeContent || !afterContent) {
      return NextResponse.json({
        error: 'Both beforeContent and afterContent are required'
      }, { status: 400 })
    }

    // Strip HTML tags
    const beforeText = beforeContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const afterText = afterContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    if (beforeText === afterText) {
      return NextResponse.json({
        diff: {
          changes: [],
          summary: 'No changes detected between versions.',
          overallAssessment: 'The content is identical.',
          claimsAdded: 0,
          claimsRemoved: 0,
          claimsModified: 0
        }
      })
    }

    const anthropic = getAnthropicClient()

    if (!anthropic) {
      return NextResponse.json({
        error: 'Semantic diff requires ANTHROPIC_API_KEY to be configured.'
      }, { status: 500 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are an expert at analyzing changes in academic and research documents. Compare two versions of a document and identify semantic changes - not just text differences, but changes in meaning, arguments, and claims.

Categorize changes as:
- **added**: New claims, arguments, or evidence introduced
- **removed**: Claims, arguments, or evidence that were deleted
- **modified**: Claims that were changed in meaning
- **strengthened**: Arguments made more forceful or better supported
- **weakened**: Arguments made less certain or lost support

Categories:
- claim: Main assertions or conclusions
- argument: Logical reasoning or supporting points
- evidence: Facts, data, citations
- structure: Organization or flow changes
- tone: Changes in certainty, hedging, or voice

Respond with JSON:
{
  "changes": [
    {
      "type": "added|removed|modified|strengthened|weakened",
      "category": "claim|argument|evidence|structure|tone",
      "description": "Clear description of what changed",
      "importance": "high|medium|low",
      "beforeText": "relevant excerpt from before (if applicable)",
      "afterText": "relevant excerpt from after (if applicable)"
    }
  ],
  "summary": "2-3 sentence summary of the key changes",
  "overallAssessment": "Assessment of whether the changes improve, maintain, or weaken the document",
  "claimsAdded": number,
  "claimsRemoved": number,
  "claimsModified": number
}

Focus on meaningful semantic changes. Only output JSON.`,
      messages: [
        {
          role: 'user',
          content: `Compare these two versions of a document:

=== BEFORE ===
${beforeText.substring(0, 6000)}

=== AFTER ===
${afterText.substring(0, 6000)}

Identify the semantic changes between these versions.`
        }
      ]
    })

    const textContent = response.content.find(c => c.type === 'text')

    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from analysis' }, { status: 500 })
    }

    try {
      const diff: SemanticDiff = JSON.parse(textContent.text)

      // Log the diff if document context provided
      if (documentId) {
        try {
          await supabase.from('ai_jobs').insert({
            user_id: user.id,
            document_id: documentId,
            job_type: 'semantic_diff',
            model: 'claude-sonnet-4-20250514',
            metadata: {
              branchA,
              branchB,
              changesCount: diff.changes.length,
              claimsAdded: diff.claimsAdded,
              claimsRemoved: diff.claimsRemoved,
              claimsModified: diff.claimsModified
            }
          })
        } catch (logError) {
          console.warn('Failed to log semantic diff:', logError)
        }
      }

      return NextResponse.json({ diff })

    } catch (parseError) {
      console.error('Error parsing semantic diff response:', parseError)
      return NextResponse.json({
        error: 'Failed to parse diff results'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Semantic diff error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
