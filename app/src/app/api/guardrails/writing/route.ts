import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface WritingIssue {
  type: 'readability' | 'tone' | 'jargon' | 'passive_voice' | 'complex_sentence' | 'redundancy'
  severity: 'low' | 'medium' | 'high'
  start_offset: number
  end_offset: number
  original_text: string
  message: string
  suggestion?: string
  replacement?: string
}

interface WritingMetrics {
  flesch_reading_ease: number // 0-100, higher is easier
  average_sentence_length: number
  passive_voice_percentage: number
  jargon_count: number
  tone: 'formal' | 'informal' | 'academic' | 'conversational' | 'mixed'
}

/**
 * POST /api/guardrails/writing - Analyze writing quality and style
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
      target_audience = 'academic', // 'academic' | 'general' | 'technical' | 'business'
      checks = ['readability', 'tone', 'jargon', 'passive_voice', 'complexity']
    } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const maxLength = 8000
    const truncatedText = text.length > maxLength ? text.slice(0, maxLength) : text

    // Calculate basic metrics locally
    const sentences = truncatedText.split(/[.!?]+/).filter((s: string) => s.trim().length > 0)
    const words = truncatedText.split(/\s+/).filter((w: string) => w.length > 0)
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0

    // Use Claude for detailed analysis
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Analyze the following text for writing quality and style issues. The target audience is: ${target_audience}

Checks to perform: ${checks.join(', ')}

Text to analyze:
"""
${truncatedText}
"""

Respond with a JSON object:
{
  "issues": [
    {
      "type": "readability" | "tone" | "jargon" | "passive_voice" | "complex_sentence" | "redundancy",
      "severity": "low" | "medium" | "high",
      "original_text": "the problematic text",
      "message": "what's wrong",
      "suggestion": "how to improve",
      "replacement": "suggested replacement text (if applicable)"
    }
  ],
  "metrics": {
    "flesch_reading_ease": 0-100,
    "passive_voice_percentage": 0-100,
    "jargon_count": number,
    "tone": "formal" | "informal" | "academic" | "conversational" | "mixed"
  },
  "summary": "brief overall assessment"
}

Only return valid JSON, no other text.`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    interface AnalysisResult {
      issues: Array<{
        type: WritingIssue['type']
        severity: WritingIssue['severity']
        original_text: string
        message: string
        suggestion?: string
        replacement?: string
      }>
      metrics: Omit<WritingMetrics, 'average_sentence_length'>
      summary: string
    }

    let result: AnalysisResult
    try {
      let jsonStr = content.text.trim()
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
      result = JSON.parse(jsonStr.trim())
    } catch {
      console.error('Failed to parse writing analysis:', content.text)
      result = {
        issues: [],
        metrics: {
          flesch_reading_ease: 50,
          passive_voice_percentage: 0,
          jargon_count: 0,
          tone: 'mixed',
        },
        summary: 'Unable to analyze text',
      }
    }

    // Enrich issues with offsets
    const enrichedIssues: WritingIssue[] = result.issues.map(issue => {
      const index = text.indexOf(issue.original_text)
      return {
        ...issue,
        start_offset: index >= 0 ? index : 0,
        end_offset: index >= 0 ? index + issue.original_text.length : 0,
      }
    }).filter(i => i.start_offset > 0 || i.end_offset > 0)

    return NextResponse.json({
      issues: enrichedIssues,
      metrics: {
        ...result.metrics,
        average_sentence_length: Math.round(avgSentenceLength * 10) / 10,
      },
      summary: result.summary,
    })

  } catch (error) {
    console.error('Writing analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/guardrails/writing/simplify - Simplify complex text
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { text, target_level = 'general' } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const levelDescriptions: Record<string, string> = {
      simple: 'elementary school level, very simple words and short sentences',
      general: 'general public, avoid jargon, clear and straightforward',
      technical: 'technically literate audience, can use some jargon but explain complex concepts',
      academic: 'academic audience, maintain precision but improve clarity',
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Simplify the following text for ${target_level} audience (${levelDescriptions[target_level] || levelDescriptions.general}).

Maintain the core meaning and any important nuances, but:
- Use simpler vocabulary where possible
- Break up complex sentences
- Replace jargon with plain language
- Make the text more accessible

Original text:
"""
${text}
"""

Respond with JSON:
{
  "simplified": "the simplified text",
  "changes": [
    {"original": "complex phrase", "simplified": "simple phrase", "reason": "why changed"}
  ]
}

Only return valid JSON.`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    let result: { simplified: string; changes: Array<{ original: string; simplified: string; reason: string }> }
    try {
      let jsonStr = content.text.trim()
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
      result = JSON.parse(jsonStr.trim())
    } catch {
      result = {
        simplified: text,
        changes: [],
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Simplification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
