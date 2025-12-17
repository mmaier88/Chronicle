import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface ExtractRequest {
  bookId: string
  sectionId: string
  content: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: ExtractRequest = await request.json()
  const { bookId, sectionId, content } = body

  // Verify ownership
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  const systemPrompt = `You are analyzing text from a book to extract semantic elements.
Book Constitution: ${JSON.stringify(book.constitution_json, null, 2)}

Extract the following from the provided text:

1. CLAIMS: Assertions, arguments, or statements of fact that the author is making.
   For each claim, identify:
   - type: assertion | definition | premise | inference | counterclaim
   - stance: pro (supports thesis) | con (challenges thesis) | neutral
   - confidence: 0.0-1.0 how central is this claim
   - text: the exact text of the claim

2. MOTIFS: Recurring concepts, themes, or images that appear across the book.
   - text: the concept or theme
   - significance: why this matters

3. THREADS: Open narrative loops, questions, or tensions that need resolution.
   - text: the thread description
   - status: open | hinted | resolved

Return JSON only:
{
  "claims": [{ "type", "stance", "confidence", "text" }],
  "motifs": [{ "text", "significance" }],
  "threads": [{ "text", "status" }]
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Extract semantic elements from this text:\n\n${content}` }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Log AI job
    await supabase.from('ai_jobs').insert({
      book_id: bookId,
      user_id: user.id,
      target_type: 'extract',
      target_id: sectionId,
      model_name: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })

    // Parse and store semantic blocks
    try {
      const parsed = JSON.parse(responseText)

      // Store claims as semantic blocks
      for (const claim of parsed.claims || []) {
        await supabase.from('semantic_blocks').insert({
          book_id: bookId,
          section_id: sectionId,
          block_type: 'claim',
          content: claim.text,
          claim_type: claim.type,
          stance: claim.stance,
          confidence: claim.confidence,
        })
      }

      // Store motifs
      for (const motif of parsed.motifs || []) {
        await supabase.from('semantic_blocks').insert({
          book_id: bookId,
          section_id: sectionId,
          block_type: 'motif',
          content: `${motif.text}: ${motif.significance}`,
        })
      }

      // Store threads
      for (const thread of parsed.threads || []) {
        await supabase.from('semantic_blocks').insert({
          book_id: bookId,
          section_id: sectionId,
          block_type: 'thread',
          content: `[${thread.status}] ${thread.text}`,
        })
      }

      return NextResponse.json({ result: parsed })
    } catch {
      return NextResponse.json({ result: responseText, parseError: true })
    }
  } catch (error) {
    console.error('AI extract error:', error)
    return NextResponse.json(
      { error: 'AI extraction failed' },
      { status: 500 }
    )
  }
}
