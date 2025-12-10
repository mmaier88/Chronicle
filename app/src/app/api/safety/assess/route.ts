import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/anthropic'
import { NextRequest, NextResponse } from 'next/server'

export interface SafetyIssue {
  type: 'unsupported_claim' | 'outdated_reference' | 'unverifiable' | 'speculation' | 'overgeneralization' | 'missing_context'
  severity: 'high' | 'medium' | 'low'
  text: string
  suggestion: string
  location?: string
}

export interface SafetyAssessment {
  overallScore: number // 0-100
  riskLevel: 'low' | 'moderate' | 'high' | 'critical'
  issues: SafetyIssue[]
  summary: string
  recommendations: string[]
  stats: {
    totalClaims: number
    supportedClaims: number
    unsupportedClaims: number
    speculativeClaims: number
    citationsCoverage: number
  }
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
    const { content, documentId, projectId } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Strip HTML tags
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    if (plainText.length < 100) {
      return NextResponse.json({
        assessment: {
          overallScore: 100,
          riskLevel: 'low',
          issues: [],
          summary: 'Document too short for meaningful assessment.',
          recommendations: ['Add more content for a thorough safety assessment.'],
          stats: {
            totalClaims: 0,
            supportedClaims: 0,
            unsupportedClaims: 0,
            speculativeClaims: 0,
            citationsCoverage: 0
          }
        }
      })
    }

    const anthropic = getAnthropicClient()

    if (!anthropic) {
      return NextResponse.json({
        error: 'Safety assessment requires ANTHROPIC_API_KEY to be configured.'
      }, { status: 500 })
    }

    // Get source count for context
    let sourcesCount = 0
    if (projectId) {
      const { count } = await supabase
        .from('sources')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
      sourcesCount = count || 0
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are an expert at assessing the reliability and safety of academic and research documents. Analyze documents for potential issues that could lead to misinformation or unreliable conclusions.

Identify issues such as:
- **unsupported_claim**: Assertions without evidence or citations
- **outdated_reference**: References to potentially outdated information
- **unverifiable**: Claims that cannot be independently verified
- **speculation**: Speculative statements presented as fact
- **overgeneralization**: Broad claims from limited evidence
- **missing_context**: Important context or caveats omitted

For each issue, assign severity:
- **high**: Could significantly mislead readers
- **medium**: May cause confusion or minor misunderstanding
- **low**: Minor issue, style improvement suggested

Calculate an overall safety score (0-100):
- 90-100: Very reliable, well-supported
- 70-89: Generally reliable with minor issues
- 50-69: Moderate concerns, needs improvement
- 30-49: Significant concerns
- 0-29: Critical issues, major revision needed

Respond with JSON:
{
  "overallScore": number,
  "riskLevel": "low|moderate|high|critical",
  "issues": [
    {
      "type": "unsupported_claim|outdated_reference|unverifiable|speculation|overgeneralization|missing_context",
      "severity": "high|medium|low",
      "text": "the problematic text excerpt",
      "suggestion": "how to fix it"
    }
  ],
  "summary": "2-3 sentence assessment summary",
  "recommendations": ["specific improvement suggestions"],
  "stats": {
    "totalClaims": number,
    "supportedClaims": number,
    "unsupportedClaims": number,
    "speculativeClaims": number,
    "citationsCoverage": percentage 0-100
  }
}

Be constructive and specific. Only output JSON.`,
      messages: [
        {
          role: 'user',
          content: `Assess the safety and reliability of this document:

${plainText.substring(0, 10000)}

${sourcesCount > 0 ? `Note: This project has ${sourcesCount} source documents uploaded for reference.` : 'Note: No source documents have been uploaded for this project.'}`
        }
      ]
    })

    const textContent = response.content.find(c => c.type === 'text')

    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from assessment' }, { status: 500 })
    }

    try {
      const assessment: SafetyAssessment = JSON.parse(textContent.text)

      // Store assessment in database
      if (documentId) {
        try {
          await supabase.from('doc_risk_assessments').insert({
            document_id: documentId,
            assessed_by: user.id,
            safety_score: assessment.overallScore,
            hallucination_flags: assessment.issues.filter(i =>
              i.type === 'unsupported_claim' || i.type === 'speculation'
            ).length,
            unsupported_claims: assessment.stats.unsupportedClaims,
            outdated_refs: assessment.issues.filter(i =>
              i.type === 'outdated_reference'
            ).length,
            details: assessment
          })
        } catch (dbError) {
          console.warn('Failed to store assessment:', dbError)
        }
      }

      return NextResponse.json({ assessment })

    } catch (parseError) {
      console.error('Error parsing safety assessment:', parseError)
      return NextResponse.json({
        error: 'Failed to parse assessment results'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Safety assessment error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
