import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/anthropic'
import { NextRequest, NextResponse } from 'next/server'

interface VerificationResult {
  citationId: string
  sourceId: string
  status: 'supported' | 'contradicted' | 'partial' | 'unverifiable'
  confidence: number
  explanation: string
  relevantChunks: {
    id: string
    content: string
    similarity: number
  }[]
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
    const { citedText, sourceId, documentId } = body

    if (!citedText || typeof citedText !== 'string') {
      return NextResponse.json({ error: 'Cited text is required' }, { status: 400 })
    }

    if (!sourceId) {
      return NextResponse.json({ error: 'Source ID is required' }, { status: 400 })
    }

    // Get source info
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('id, title')
      .eq('id', sourceId)
      .single()

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    // Get source chunks for this source
    const { data: chunks, error: chunksError } = await supabase
      .from('source_chunks')
      .select('id, content')
      .eq('source_id', sourceId)
      .limit(20)

    if (chunksError) {
      console.error('Error fetching chunks:', chunksError)
      return NextResponse.json({ error: 'Failed to fetch source content' }, { status: 500 })
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        verification: {
          status: 'unverifiable',
          confidence: 0,
          explanation: 'Source has not been processed yet. Please process the PDF first.',
          relevantChunks: []
        }
      })
    }

    // Check if Anthropic client is available
    const anthropic = getAnthropicClient()

    if (!anthropic) {
      // Return a basic verification without AI analysis
      return NextResponse.json({
        verification: {
          status: 'unverifiable',
          confidence: 0,
          explanation: 'AI verification not available. Add ANTHROPIC_API_KEY to enable citation verification.',
          relevantChunks: chunks.slice(0, 3).map(c => ({
            id: c.id,
            content: c.content.substring(0, 200) + '...',
            similarity: 0
          }))
        }
      })
    }

    // Build context from chunks
    const context = chunks.map((c, i) => `[Chunk ${i + 1}]: ${c.content}`).join('\n\n')

    // Use Claude to verify the citation
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a citation verification assistant. Your job is to verify whether a cited claim is supported by the source material provided.

Analyze the claim and the source content, then respond with a JSON object containing:
- status: one of "supported", "contradicted", "partial", or "unverifiable"
  - "supported": The source clearly supports this claim
  - "contradicted": The source contradicts this claim
  - "partial": The source partially supports this claim but with important nuances
  - "unverifiable": Cannot determine from the provided source content
- confidence: a number from 0 to 1 indicating your confidence
- explanation: a brief explanation of your assessment
- relevant_chunks: array of chunk numbers (1-indexed) that are most relevant

Respond ONLY with the JSON object, no other text.`,
      messages: [
        {
          role: 'user',
          content: `Source: "${source.title}"

Source Content:
${context}

---

Cited Claim: "${citedText}"

Verify whether the source supports this claim.`
        }
      ]
    })

    const textContent = response.content.find(c => c.type === 'text')

    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from verification' }, { status: 500 })
    }

    try {
      const verification = JSON.parse(textContent.text)

      // Get relevant chunks based on AI response
      const relevantChunks = (verification.relevant_chunks || [])
        .filter((i: number) => i >= 1 && i <= chunks.length)
        .map((i: number) => ({
          id: chunks[i - 1].id,
          content: chunks[i - 1].content.substring(0, 300) + '...',
          similarity: verification.confidence
        }))

      // Log the verification run
      try {
        await supabase.from('citation_verification_runs').insert({
          document_id: documentId || null,
          run_by: user.id,
          run_type: 'single',
          summary: {
            total: 1,
            supported: verification.status === 'supported' ? 1 : 0,
            contradicted: verification.status === 'contradicted' ? 1 : 0,
            partial: verification.status === 'partial' ? 1 : 0,
            unverifiable: verification.status === 'unverifiable' ? 1 : 0
          }
        })
      } catch (logError) {
        console.warn('Failed to log verification run:', logError)
      }

      return NextResponse.json({
        verification: {
          status: verification.status,
          confidence: verification.confidence,
          explanation: verification.explanation,
          relevantChunks
        }
      })

    } catch (parseError) {
      console.error('Error parsing verification response:', parseError)
      return NextResponse.json({
        verification: {
          status: 'unverifiable',
          confidence: 0,
          explanation: 'Error processing verification response',
          relevantChunks: []
        }
      })
    }

  } catch (error) {
    console.error('Citation verification error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
