import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface ConsistencyRequest {
  bookId: string
  chapterId?: string
  scope: 'chapter' | 'book'
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: ConsistencyRequest = await request.json()
  const { bookId, chapterId, scope } = body

  // Fetch book with constitution
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  // Fetch canonical content based on scope
  let contentToCheck = ''

  if (scope === 'chapter' && chapterId) {
    const { data: sections } = await supabase
      .from('sections')
      .select('title, content_text, local_claim')
      .eq('chapter_id', chapterId)
      .eq('status', 'canonical')
      .order('index', { ascending: true })

    contentToCheck = sections?.map(s =>
      `### ${s.title}\nClaim: ${s.local_claim || 'None'}\n\n${s.content_text || ''}`
    ).join('\n\n---\n\n') || ''
  } else {
    // Book-wide check - get all canonical sections
    const { data: chapters } = await supabase
      .from('chapters')
      .select(`
        title,
        central_claim,
        sections (
          title,
          content_text,
          local_claim,
          status,
          index
        )
      `)
      .eq('book_id', bookId)
      .order('index', { ascending: true })

    contentToCheck = chapters?.map(ch => {
      const canonicalSections = (ch.sections as Array<{
        title: string
        content_text: string | null
        local_claim: string | null
        status: string
        index: number
      }>)?.filter(s => s.status === 'canonical')
        .sort((a, b) => a.index - b.index)
        .map(s => `#### ${s.title}\n${s.content_text || ''}`)
        .join('\n\n')

      return `## ${ch.title}\nChapter Claim: ${ch.central_claim || 'None'}\n\n${canonicalSections}`
    }).join('\n\n===\n\n') || ''
  }

  if (!contentToCheck.trim()) {
    return NextResponse.json({
      result: {
        contradictions: [],
        tone_drift: [],
        unresolved_threads: [],
        constitution_violations: [],
        summary: 'No canonical content to check.',
        severity: 'info',
      }
    })
  }

  const systemPrompt = `You are a literary editor checking a book manuscript for consistency.

Book Constitution (the author's guiding principles):
${JSON.stringify(book.constitution_json, null, 2)}

Analyze the provided content and identify:

1. CONTRADICTIONS: Places where claims or facts contradict each other
   - location1: where first statement appears
   - location2: where contradicting statement appears
   - description: what the contradiction is
   - severity: minor | major | critical

2. TONE_DRIFT: Places where the writing voice deviates from the stated narrative voice
   - location: where the drift occurs
   - expected: what tone was expected
   - actual: what tone appeared
   - severity: minor | major

3. UNRESOLVED_THREADS: Narrative threads that were opened but never resolved
   - location: where thread was introduced
   - thread: what the thread is
   - status: orphaned | dangling | needs_resolution

4. CONSTITUTION_VIOLATIONS: Places where the content violates the author's stated principles
   - location: where violation occurs
   - principle: which constitution field is violated
   - violation: what the violation is
   - severity: minor | major | critical

Return JSON:
{
  "contradictions": [...],
  "tone_drift": [...],
  "unresolved_threads": [...],
  "constitution_violations": [...],
  "summary": "Brief overall assessment",
  "severity": "info | warning | critical"
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Check this content for consistency:\n\n${contentToCheck}` }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Log AI job
    const { error: jobLogError } = await supabase.from('ai_jobs').insert({
      book_id: bookId,
      user_id: user.id,
      target_type: 'consistency',
      target_id: chapterId || bookId,
      model_name: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    if (jobLogError) {
      console.error('Failed to log AI job:', jobLogError)
    }

    // Parse and store consistency report
    try {
      const parsed = JSON.parse(responseText)

      // Store report
      const { error: reportError } = await supabase.from('consistency_reports').insert({
        book_id: bookId,
        chapter_id: chapterId || null,
        report_type: scope,
        contradictions: parsed.contradictions || [],
        tone_drift: parsed.tone_drift || [],
        unresolved_threads: parsed.unresolved_threads || [],
        constitution_violations: parsed.constitution_violations || [],
        summary: parsed.summary,
        severity: parsed.severity,
      })
      if (reportError) {
        console.error('Failed to store consistency report:', reportError)
      }

      return NextResponse.json({ result: parsed })
    } catch {
      return NextResponse.json({ result: responseText, parseError: true })
    }
  } catch (error) {
    console.error('Consistency check error:', error)
    return NextResponse.json(
      { error: 'Consistency check failed' },
      { status: 500 }
    )
  }
}
