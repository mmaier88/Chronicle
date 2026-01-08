import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { PROSE_SYSTEM_PROMPT, PROSE_QUALITY_CHECKLIST } from '@/lib/prose-guidelines'
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'
import {
  apiSuccess,
  ApiErrors,
  validateBody,
  isApiError,
  aiGenerateSchema,
} from '@/lib/api-utils'

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return ApiErrors.unauthorized()
  }

  // Rate limit per user
  const rateLimit = checkRateLimit(`ai:${user.id}`, RATE_LIMITS.aiGenerate)
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please wait before generating more content.' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    )
  }

  // Validate request body
  const validated = await validateBody(request, aiGenerateSchema)
  if (isApiError(validated)) return validated

  const { bookId, chapterId, sectionId, type, field } = validated

  // Fetch book data
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    return ApiErrors.notFound('Book')
  }

  let prompt = ''
  let systemPrompt = ''

  if (type === 'constitution' && field) {
    systemPrompt = `You are helping an author develop the foundational principles of their book.
The book is titled "${book.title}" and is ${book.genre === 'non_fiction' ? 'non-fiction' : 'literary fiction'}.
${book.core_question ? `The core question the book explores: ${book.core_question}` : ''}

Generate content for the "${field}" field of the book's constitution.`

    const fieldPrompts: Record<string, string> = {
      central_thesis: 'What is the main argument or insight this book will convey? Be specific and provocative.',
      worldview_frame: 'What perspective or lens does this book use to view its subject? What assumptions underlie it?',
      narrative_voice: 'What tone and style defines the writing? Formal, conversational, academic, lyrical?',
      what_book_is_against: 'What ideas, positions, or approaches does this book oppose or critique?',
      what_book_refuses_to_do: 'What compromises, simplifications, or approaches are off-limits for this book?',
      ideal_reader: 'Who is this book written for? What do they already know? What do they care about?',
      taboo_simplifications: 'What oversimplifications should this book avoid, even if they would be easier?',
    }

    prompt = fieldPrompts[field] || 'Generate appropriate content for this field.'
  } else if (type === 'chapter' && chapterId) {
    // Fetch chapter
    const { data: chapter } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single()

    if (!chapter) {
      return ApiErrors.notFound('Chapter')
    }

    systemPrompt = `You are helping an author develop chapter content for their book.
Book: "${book.title}"
Constitution: ${JSON.stringify(book.constitution_json, null, 2)}
Chapter: "${chapter.title}"
${chapter.purpose ? `Purpose: ${chapter.purpose}` : ''}
${chapter.central_claim ? `Central Claim: ${chapter.central_claim}` : ''}`

    prompt = `Generate a detailed chapter outline with 3-7 sections. For each section provide:
- Title
- Goal (what the section should accomplish)
- Local claim (the specific point it makes)

Return as JSON: { sections: [{ title, goal, local_claim }] }`
  } else if (type === 'section' && sectionId) {
    // Fetch section with chapter context
    const { data: section } = await supabase
      .from('sections')
      .select('*, chapter:chapters(*)')
      .eq('id', sectionId)
      .single()

    if (!section) {
      return ApiErrors.notFound('Section')
    }

    // Fetch previous sections for context
    const { data: previousSections } = await supabase
      .from('sections')
      .select('title, content_text')
      .eq('chapter_id', section.chapter_id)
      .lt('index', section.index)
      .eq('status', 'canonical')
      .order('index', { ascending: true })

    const previousContext = previousSections?.map(s =>
      `### ${s.title}\n${s.content_text || ''}`
    ).join('\n\n') || ''

    const constitution = book.constitution_json || {}

    systemPrompt = `You are a literary fiction writer crafting a section of a book. Your prose must feel human-authored, not AI-generated.

${PROSE_SYSTEM_PROMPT}

BOOK CONSTITUTION:
${JSON.stringify(constitution, null, 2)}

Chapter: ${section.chapter?.title || 'Untitled'}
${section.chapter?.purpose ? `Chapter Purpose: ${section.chapter.purpose}` : ''}
${section.chapter?.central_claim ? `Chapter Claim: ${section.chapter.central_claim}` : ''}

Section: ${section.title}
${section.goal ? `Goal: ${section.goal}` : ''}
${section.local_claim ? `Local Claim: ${section.local_claim}` : ''}
${section.constraints ? `Constraints: ${section.constraints}` : ''}

${previousContext ? `Previous sections in this chapter:\n${previousContext}` : ''}

${PROSE_QUALITY_CHECKLIST}

Write prose that:
1. Advances the local claim of this section
2. Maintains the narrative voice from the constitution
3. Stays true to the book's central thesis
4. Avoids the taboo simplifications listed in the constitution
5. Grounds every abstract concept in sensory, physical detail
6. Ends paragraphs on action or image, never moral conclusions`

    prompt = `Write the content for this section. The prose should be polished, publication-ready, and feel distinctly human.

Include 2-4 key claims that should be marked as important assertions.

Remember: Ground every moment in sensory detail. End on action or image, not explanation. Make dialogue messy and human. Vary your sentence rhythm.

Return as JSON: { prose: "...", claims: ["claim1", "claim2"] }`
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    const responseText = content.type === 'text' ? content.text : ''

    // Log AI job
    await supabase.from('ai_jobs').insert({
      book_id: bookId,
      user_id: user.id,
      target_type: type,
      target_id: sectionId || chapterId || bookId,
      model_name: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })

    // Try to parse as JSON, otherwise return as text
    try {
      const parsed = JSON.parse(responseText)
      return apiSuccess({ result: parsed, raw: responseText })
    } catch {
      return apiSuccess({ result: responseText, raw: responseText })
    }
  } catch (error) {
    console.error('AI generation error:', error)

    // Log failed job
    await supabase.from('ai_jobs').insert({
      book_id: bookId,
      user_id: user.id,
      target_type: type,
      target_id: sectionId || chapterId || bookId,
      model_name: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    })

    return ApiErrors.internal('AI generation failed')
  }
}
