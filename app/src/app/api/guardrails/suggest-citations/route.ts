import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'

interface CitationSuggestion {
  claim_text: string
  start_offset: number
  end_offset: number
  reason: string
  suggested_search_terms: string[]
  matching_sources?: Array<{
    id: string
    title: string
    relevance: number
  }>
}

/**
 * POST /api/guardrails/suggest-citations - Find claims that need citations
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { text, project_id, include_source_search = true } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const anthropic = getAnthropicClient()
    if (!anthropic) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    // Truncate very long text
    const maxLength = 8000
    const truncatedText = text.length > maxLength ? text.slice(0, maxLength) : text

    // Use Claude to identify claims needing citations
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Analyze the following text and identify factual claims that should have citations but don't appear to have them. Focus on:
- Statistical claims or specific numbers
- Research findings or study results
- Historical facts or dates
- Quotes or attributed statements
- Scientific or technical claims
- Controversial or debatable statements presented as fact

Text to analyze:
"""
${truncatedText}
"""

Respond with a JSON array of claims needing citations:
[
  {
    "claim_text": "exact text of the claim",
    "reason": "why this needs a citation",
    "suggested_search_terms": ["term1", "term2"]
  }
]

Only return valid JSON array, no other text. If no claims need citations, return [].`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    let claims: Array<{ claim_text: string; reason: string; suggested_search_terms: string[] }> = []
    try {
      let jsonStr = content.text.trim()
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
      claims = JSON.parse(jsonStr.trim())
    } catch {
      console.error('Failed to parse citation suggestions:', content.text)
      claims = []
    }

    // Enrich with offsets
    const suggestions: CitationSuggestion[] = claims.map(claim => {
      const index = text.indexOf(claim.claim_text)
      return {
        ...claim,
        start_offset: index >= 0 ? index : 0,
        end_offset: index >= 0 ? index + claim.claim_text.length : 0,
      }
    }).filter(s => s.start_offset > 0 || s.end_offset > 0)

    // Optionally search for matching sources in the project
    if (include_source_search && project_id && suggestions.length > 0) {
      // Get embeddings for the claims and search
      // For now, we'll do a simple text search
      for (const suggestion of suggestions) {
        const searchTerms = suggestion.suggested_search_terms.join(' ')

        const { data: sources } = await supabase
          .from('sources')
          .select('id, title')
          .eq('project_id', project_id)
          .textSearch('title', searchTerms, { type: 'websearch' })
          .limit(3)

        if (sources && sources.length > 0) {
          suggestion.matching_sources = sources.map((s, i) => ({
            id: s.id,
            title: s.title,
            relevance: 1 - (i * 0.2), // Simple relevance scoring
          }))
        }
      }
    }

    return NextResponse.json({ suggestions })

  } catch (error) {
    console.error('Citation suggestion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
