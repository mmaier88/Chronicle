import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface FactCheckResult {
  claim: string
  start_offset: number
  end_offset: number
  verdict: 'supported' | 'unsupported' | 'partially_supported' | 'needs_verification' | 'opinion'
  confidence: number // 0-1
  explanation: string
  sources_checked?: string[]
  suggested_verification?: string
}

/**
 * POST /api/guardrails/fact-check - Check factual claims against knowledge
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { text, claims, project_id } = body

    // Either analyze full text or check specific claims
    if (!text && (!claims || claims.length === 0)) {
      return NextResponse.json({ error: 'text or claims required' }, { status: 400 })
    }

    let claimsToCheck: string[] = claims || []

    // If full text provided, extract claims first
    if (text && !claims) {
      const extractResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Extract factual claims from this text that can be fact-checked. Focus on specific, verifiable claims (statistics, dates, scientific facts, etc.).

Text:
"""
${text.slice(0, 5000)}
"""

Respond with a JSON array of claim strings:
["claim 1", "claim 2", ...]

Only return the JSON array, nothing else.`,
          },
        ],
      })

      const extractContent = extractResponse.content[0]
      if (extractContent.type === 'text') {
        try {
          let jsonStr = extractContent.text.trim()
          if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
          claimsToCheck = JSON.parse(jsonStr)
        } catch {
          claimsToCheck = []
        }
      }
    }

    if (claimsToCheck.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'No factual claims found to verify',
      })
    }

    // Limit to 10 claims for performance
    claimsToCheck = claimsToCheck.slice(0, 10)

    // Check claims against project sources if available
    let sourceContext = ''
    if (project_id) {
      const { data: sources } = await supabase
        .from('sources')
        .select('title, content')
        .eq('project_id', project_id)
        .not('content', 'is', null)
        .limit(5)

      if (sources && sources.length > 0) {
        sourceContext = `\n\nAvailable sources for verification:\n${sources.map(s => `- ${s.title}: ${s.content?.slice(0, 500)}...`).join('\n')}`
      }
    }

    // Fact-check the claims
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Fact-check the following claims. For each claim, assess its accuracy based on your knowledge.
${sourceContext}

Claims to check:
${claimsToCheck.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

For each claim, respond with JSON array:
[
  {
    "claim": "the claim text",
    "verdict": "supported" | "unsupported" | "partially_supported" | "needs_verification" | "opinion",
    "confidence": 0.0-1.0,
    "explanation": "why this verdict",
    "suggested_verification": "how to verify this claim (if needed)"
  }
]

Verdicts:
- supported: Claim is accurate according to established knowledge
- unsupported: Claim contradicts established knowledge
- partially_supported: Claim is partially accurate but has issues
- needs_verification: Cannot determine accuracy, needs external verification
- opinion: This is an opinion/value judgment, not a factual claim

Only return the JSON array.`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    let results: Omit<FactCheckResult, 'start_offset' | 'end_offset'>[]
    try {
      let jsonStr = content.text.trim()
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
      results = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse fact-check results:', content.text)
      results = []
    }

    // Add offsets if original text provided
    const enrichedResults: FactCheckResult[] = results.map(r => {
      let startOffset = 0
      let endOffset = 0

      if (text) {
        const index = text.indexOf(r.claim)
        if (index >= 0) {
          startOffset = index
          endOffset = index + r.claim.length
        }
      }

      return {
        ...r,
        start_offset: startOffset,
        end_offset: endOffset,
      }
    })

    // Summary statistics
    const summary = {
      total: enrichedResults.length,
      supported: enrichedResults.filter(r => r.verdict === 'supported').length,
      unsupported: enrichedResults.filter(r => r.verdict === 'unsupported').length,
      needs_verification: enrichedResults.filter(r => r.verdict === 'needs_verification').length,
      average_confidence: enrichedResults.length > 0
        ? enrichedResults.reduce((sum, r) => sum + r.confidence, 0) / enrichedResults.length
        : 0,
    }

    return NextResponse.json({
      results: enrichedResults,
      summary,
    })

  } catch (error) {
    console.error('Fact-check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
