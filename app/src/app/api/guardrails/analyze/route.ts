import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface GuardrailWarning {
  type: 'unsupported_claim' | 'hallucination' | 'speculation' | 'outdated_reference' | 'bias' | 'jargon'
  severity: 'low' | 'medium' | 'high'
  start_offset: number
  end_offset: number
  text: string
  message: string
  suggestion?: string
}

interface GuardrailSuggestion {
  type: 'add_citation' | 'strengthen_argument' | 'clarify' | 'simplify'
  start_offset: number
  end_offset: number
  text: string
  message: string
  action?: string
}

interface AnalysisResult {
  warnings: GuardrailWarning[]
  suggestions: GuardrailSuggestion[]
  metrics: {
    readability_score: number
    confidence_score: number
    citation_coverage: number
  }
}

/**
 * POST /api/guardrails/analyze - Analyze text for potential issues
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
      text,
      document_id,
      sensitivity = 'medium', // 'strict' | 'medium' | 'relaxed'
      checks = ['claims', 'speculation', 'citations', 'readability']
    } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    // Truncate very long text
    const maxLength = 10000
    const truncatedText = text.length > maxLength ? text.slice(0, maxLength) : text

    // Build the analysis prompt based on requested checks
    const checkDescriptions: Record<string, string> = {
      claims: 'Identify factual claims that lack supporting evidence or citations',
      speculation: 'Flag speculative statements or opinions presented as facts',
      citations: 'Find statements that would benefit from citations',
      readability: 'Identify jargon, complex sentences, or unclear phrasing',
      bias: 'Detect potential bias or one-sided arguments',
    }

    const activeChecks = checks
      .filter((c: string) => checkDescriptions[c])
      .map((c: string) => `- ${c}: ${checkDescriptions[c]}`)
      .join('\n')

    const sensitivityInstructions: Record<string, string> = {
      strict: 'Be very thorough. Flag even minor issues and potential problems.',
      medium: 'Balance thoroughness with practicality. Flag clear issues and notable concerns.',
      relaxed: 'Only flag significant issues that clearly need attention.',
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are an AI writing assistant that analyzes academic and research text for potential issues. Analyze the following text and identify any problems.

Sensitivity level: ${sensitivity}
${sensitivityInstructions[sensitivity] || sensitivityInstructions.medium}

Checks to perform:
${activeChecks}

Text to analyze:
"""
${truncatedText}
"""

Respond with a JSON object containing:
{
  "warnings": [
    {
      "type": "unsupported_claim" | "hallucination" | "speculation" | "outdated_reference" | "bias" | "jargon",
      "severity": "low" | "medium" | "high",
      "text": "the exact problematic text",
      "message": "explanation of the issue",
      "suggestion": "how to fix it (optional)"
    }
  ],
  "suggestions": [
    {
      "type": "add_citation" | "strengthen_argument" | "clarify" | "simplify",
      "text": "the text that could be improved",
      "message": "what improvement is suggested"
    }
  ],
  "metrics": {
    "readability_score": 0-100 (higher is more readable),
    "confidence_score": 0-100 (how confident are the claims),
    "citation_coverage": 0-100 (what percentage of claims have citations)
  }
}

Only return valid JSON, no other text.`,
        },
      ],
    })

    // Parse the response
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    let result: AnalysisResult
    try {
      // Extract JSON from the response (handle markdown code blocks)
      let jsonStr = content.text.trim()
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7)
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3)
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3)
      }
      result = JSON.parse(jsonStr.trim())
    } catch {
      console.error('Failed to parse guardrails response:', content.text)
      result = {
        warnings: [],
        suggestions: [],
        metrics: {
          readability_score: 70,
          confidence_score: 50,
          citation_coverage: 0,
        },
      }
    }

    // Find offsets for each warning/suggestion in the original text
    const enrichedWarnings = result.warnings.map(w => {
      const index = text.indexOf(w.text)
      return {
        ...w,
        start_offset: index >= 0 ? index : 0,
        end_offset: index >= 0 ? index + w.text.length : 0,
      }
    }).filter(w => w.start_offset > 0 || w.end_offset > 0)

    const enrichedSuggestions = result.suggestions.map(s => {
      const index = text.indexOf(s.text)
      return {
        ...s,
        start_offset: index >= 0 ? index : 0,
        end_offset: index >= 0 ? index + s.text.length : 0,
      }
    }).filter(s => s.start_offset > 0 || s.end_offset > 0)

    // Log the analysis if document_id provided
    if (document_id) {
      await supabase.rpc('log_activity', {
        p_action: 'guardrails.analyze',
        p_document_id: document_id,
        p_target_type: 'document',
        p_target_id: document_id,
        p_details: {
          sensitivity,
          checks,
          warning_count: enrichedWarnings.length,
          suggestion_count: enrichedSuggestions.length,
        },
      })
    }

    return NextResponse.json({
      warnings: enrichedWarnings,
      suggestions: enrichedSuggestions,
      metrics: result.metrics,
    })

  } catch (error) {
    console.error('Guardrails analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
