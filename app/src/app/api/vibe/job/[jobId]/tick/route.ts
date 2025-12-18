import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { VibePreview, Constitution, VibeChapterPlan } from '@/types/chronicle'

const anthropic = new Anthropic()

const MAX_RETRIES = 3
const TARGET_WORD_COUNT = 8500 // ~30 pages
const CHAPTERS_TARGET = 7
const SECTIONS_PER_CHAPTER = 2

interface VibeJob {
  id: string
  user_id: string
  book_id: string
  genre: string
  user_prompt: string
  preview: VibePreview
  status: string
  step: string | null
  progress: number
  story_synopsis: string | null
  error: string | null
  attempt: number
}

// Helper to update job status
async function updateJob(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, jobId: string, updates: Record<string, unknown>) {
  await supabase
    .from('vibe_jobs')
    .update(updates)
    .eq('id', jobId)
}

// Generate constitution from preview
async function generateConstitution(preview: VibePreview, genre: string): Promise<Constitution> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: `You are creating an internal "constitution" for a book based on its preview. This constitution guides AI writing to maintain consistency.

Return ONLY valid JSON matching this schema:
{
  "central_thesis": "The core message or insight of the book",
  "worldview_frame": "The perspective through which the story views its subject",
  "narrative_voice": "The tone and style of the writing",
  "what_book_is_against": "Ideas or approaches the book critiques",
  "what_book_refuses_to_do": "Compromises the book won't make",
  "ideal_reader": "Who this book is for",
  "taboo_simplifications": "Oversimplifications to avoid"
}`,
    messages: [{
      role: 'user',
      content: `Create a constitution for this ${genre} book:

Title: ${preview.title}
Logline: ${preview.logline}
Blurb: ${preview.blurb}
Setting: ${preview.setting}
Promise: ${preview.promise.join(', ')}
Characters: ${preview.cast.map(c => `${c.name}: ${c.tagline}`).join('; ')}`
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || [null, text]
  return JSON.parse((jsonMatch[1] || text).trim())
}

// Generate chapter/section plan
async function generatePlan(preview: VibePreview, constitution: Constitution): Promise<VibeChapterPlan[]> {
  const wordsPerSection = Math.round(TARGET_WORD_COUNT / (CHAPTERS_TARGET * SECTIONS_PER_CHAPTER))

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are planning a ~30 page book (${TARGET_WORD_COUNT} words total) with ${CHAPTERS_TARGET} chapters.
Each chapter has ${SECTIONS_PER_CHAPTER} sections, each ~${wordsPerSection} words.

Return ONLY valid JSON array:
[
  {
    "title": "Chapter title",
    "purpose": "What this chapter accomplishes",
    "sections": [
      { "title": "Section title", "goal": "What happens/is explored", "target_words": ${wordsPerSection} }
    ]
  }
]

Structure the story with clear beginning, middle, end. Each chapter should advance the plot/argument.
Do NOT include plot twists or spoilers in section goals - keep descriptions vague enough for non-spoiler planning.`,
    messages: [{
      role: 'user',
      content: `Plan chapters for:

Title: ${preview.title}
Logline: ${preview.logline}
Blurb: ${preview.blurb}
Constitution thesis: ${constitution.central_thesis}
Voice: ${constitution.narrative_voice}`
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || [null, text]
  return JSON.parse((jsonMatch[1] || text).trim())
}

// Write a single section
async function writeSection(
  preview: VibePreview,
  constitution: Constitution,
  chapterTitle: string,
  chapterPurpose: string,
  sectionTitle: string,
  sectionGoal: string,
  targetWords: number,
  previousSections: string[],
  storySynopsis: string | null
): Promise<{ prose: string; synopsis: string }> {
  const context = previousSections.length > 0
    ? `Previous sections:\n${previousSections.slice(-2).join('\n\n---\n\n')}`
    : 'This is the opening of the book.'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are writing a section of a book. Write engaging, publication-ready prose.

Voice: ${constitution.narrative_voice}
Avoid: ${constitution.taboo_simplifications}
Theme: ${constitution.central_thesis}

Write approximately ${targetWords} words. The prose should flow naturally and advance the story.

After the prose, provide a 1-2 sentence synopsis update for the "story so far".

Return JSON:
{
  "prose": "The full section text...",
  "synopsis": "Updated story-so-far summary..."
}`,
    messages: [{
      role: 'user',
      content: `Write this section:

Chapter: ${chapterTitle}
Chapter purpose: ${chapterPurpose}
Section: ${sectionTitle}
Goal: ${sectionGoal}

Story so far: ${storySynopsis || 'Beginning of story'}

${context}

Characters: ${preview.cast.map(c => `${c.name}: ${c.tagline}`).join('; ')}
Setting: ${preview.setting}`
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || [null, text]
  return JSON.parse((jsonMatch[1] || text).trim())
}

// Run consistency check
async function checkConsistency(
  prose: string,
  constitution: Constitution,
  previousSections: string[]
): Promise<{ passed: boolean; issues: string[] }> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `You are checking a book section for consistency issues.

Check for:
1. Contradictions with previous sections (character names, events, timeline)
2. Tone drift from the established voice
3. Constitution violations

Return JSON:
{
  "passed": true/false,
  "issues": ["issue1", "issue2"] // empty if passed
}`,
    messages: [{
      role: 'user',
      content: `Check this section:

${prose}

Constitution voice: ${constitution.narrative_voice}
Thesis: ${constitution.central_thesis}
Avoid: ${constitution.taboo_simplifications}

Previous context:
${previousSections.slice(-2).join('\n---\n')}`
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || [null, text]
  return JSON.parse((jsonMatch[1] || text).trim())
}

// Rewrite section with fixes
async function rewriteSection(
  prose: string,
  issues: string[],
  constitution: Constitution,
  sectionGoal: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `Rewrite this section to fix the identified issues while maintaining the same general content and flow.

Voice: ${constitution.narrative_voice}
Goal: ${sectionGoal}

Return ONLY the rewritten prose, no JSON wrapper.`,
    messages: [{
      role: 'user',
      content: `Original section:
${prose}

Issues to fix:
${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}`
    }],
  })

  return message.content[0].type === 'text' ? message.content[0].text : prose
}

// Convert markdown to HTML
function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch job
  const { data: job, error: jobError } = await supabase
    .from('vibe_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const vibeJob = job as VibeJob

  if (vibeJob.status === 'complete') {
    return NextResponse.json({
      status: 'complete',
      book_id: vibeJob.book_id,
      message: 'Book generation already complete'
    })
  }

  if (vibeJob.status === 'failed') {
    return NextResponse.json({
      status: 'failed',
      error: vibeJob.error,
      message: 'Job failed. Create a new job to retry.'
    }, { status: 400 })
  }

  // Mark as running if queued
  if (vibeJob.status === 'queued') {
    await updateJob(supabase, jobId, {
      status: 'running',
      started_at: new Date().toISOString()
    })
  }

  try {
    const step = vibeJob.step || 'created'
    const preview = vibeJob.preview as VibePreview

    // Fetch book
    const { data: book } = await supabase
      .from('books')
      .select('*')
      .eq('id', vibeJob.book_id)
      .single()

    if (!book) {
      throw new Error('Book not found')
    }

    // STEP: Constitution
    if (step === 'created' || step === 'constitution') {
      await updateJob(supabase, jobId, { step: 'constitution', progress: 5 })

      const constitution = await generateConstitution(preview, vibeJob.genre)

      await supabase
        .from('books')
        .update({
          constitution_json: constitution,
          constitution_locked: true,
          constitution_locked_at: new Date().toISOString()
        })
        .eq('id', book.id)

      await updateJob(supabase, jobId, { step: 'plan', progress: 10 })

      return NextResponse.json({
        status: 'running',
        step: 'plan',
        progress: 10,
        message: 'Constitution generated. Next: planning chapters.'
      })
    }

    // STEP: Plan chapters/sections
    if (step === 'plan') {
      const constitution = book.constitution_json as Constitution
      const plan = await generatePlan(preview, constitution)

      // Create chapters and sections in DB
      for (let chIdx = 0; chIdx < plan.length; chIdx++) {
        const ch = plan[chIdx]

        const { data: chapter } = await supabase
          .from('chapters')
          .insert({
            book_id: book.id,
            index: chIdx,
            title: ch.title,
            purpose: ch.purpose,
            status: 'draft'
          })
          .select()
          .single()

        if (chapter) {
          for (let sIdx = 0; sIdx < ch.sections.length; sIdx++) {
            const sec = ch.sections[sIdx]
            await supabase
              .from('sections')
              .insert({
                chapter_id: chapter.id,
                index: sIdx,
                title: sec.title,
                goal: sec.goal,
                constraints: `Target: ~${sec.target_words} words`,
                status: 'draft'
              })
          }
        }
      }

      await updateJob(supabase, jobId, { step: 'write_ch0_s0', progress: 15 })

      return NextResponse.json({
        status: 'running',
        step: 'write_ch0_s0',
        progress: 15,
        message: `Plan created: ${plan.length} chapters. Next: writing sections.`
      })
    }

    // STEP: Write sections (write_chX_sY)
    const writeMatch = step.match(/^write_ch(\d+)_s(\d+)$/)
    if (writeMatch) {
      const chapterIdx = parseInt(writeMatch[1])
      const sectionIdx = parseInt(writeMatch[2])

      // Fetch all chapters and sections
      const { data: chapters } = await supabase
        .from('chapters')
        .select('*, sections(*)')
        .eq('book_id', book.id)
        .order('index')

      if (!chapters || chapters.length === 0) {
        throw new Error('No chapters found')
      }

      const totalSections = chapters.reduce((sum, ch) => sum + (ch.sections?.length || 0), 0)
      const currentSectionNumber = chapters.slice(0, chapterIdx).reduce((sum, ch) => sum + (ch.sections?.length || 0), 0) + sectionIdx

      const chapter = chapters[chapterIdx]
      const sections = (chapter.sections || []).sort((a: { index: number }, b: { index: number }) => a.index - b.index)
      const section = sections[sectionIdx]

      if (!section) {
        throw new Error(`Section not found: ch${chapterIdx}_s${sectionIdx}`)
      }

      // Get previous canonical sections for context
      const { data: previousSections } = await supabase
        .from('sections')
        .select('content_text')
        .eq('status', 'canonical')
        .order('promoted_at')

      const prevTexts = (previousSections || []).map(s => s.content_text).filter(Boolean) as string[]

      // Write section
      const constitution = book.constitution_json as Constitution
      const result = await writeSection(
        preview,
        constitution,
        chapter.title,
        chapter.purpose || '',
        section.title,
        section.goal || '',
        600, // target words per section
        prevTexts,
        vibeJob.story_synopsis
      )

      // Check consistency
      const consistency = await checkConsistency(result.prose, constitution, prevTexts)

      let finalProse = result.prose

      // Rewrite if issues (up to MAX_RETRIES)
      if (!consistency.passed && vibeJob.attempt < MAX_RETRIES) {
        finalProse = await rewriteSection(result.prose, consistency.issues, constitution, section.goal || '')
        await updateJob(supabase, jobId, { attempt: vibeJob.attempt + 1 })
      }

      // Convert to HTML and save
      const htmlContent = markdownToHtml(finalProse)

      await supabase
        .from('sections')
        .update({
          content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: finalProse }] }] },
          content_text: finalProse,
          status: 'canonical',
          promoted_at: new Date().toISOString(),
          promoted_by: user.id
        })
        .eq('id', section.id)

      // Update synopsis
      await updateJob(supabase, jobId, { story_synopsis: result.synopsis })

      // Calculate next step
      const nextSectionIdx = sectionIdx + 1
      const hasMoreSectionsInChapter = nextSectionIdx < sections.length
      const nextChapterIdx = chapterIdx + 1
      const hasMoreChapters = nextChapterIdx < chapters.length

      let nextStep: string
      let progress: number

      if (hasMoreSectionsInChapter) {
        nextStep = `write_ch${chapterIdx}_s${nextSectionIdx}`
        progress = 20 + Math.round((currentSectionNumber + 1) / totalSections * 70)
      } else if (hasMoreChapters) {
        // Lock current chapter before moving on
        await supabase
          .from('chapters')
          .update({ status: 'locked' })
          .eq('id', chapter.id)

        nextStep = `write_ch${nextChapterIdx}_s0`
        progress = 20 + Math.round((currentSectionNumber + 1) / totalSections * 70)
      } else {
        // All sections done - finalize
        await supabase
          .from('chapters')
          .update({ status: 'locked' })
          .eq('id', chapter.id)

        nextStep = 'finalize'
        progress = 95
      }

      await updateJob(supabase, jobId, { step: nextStep, progress, attempt: 0 })

      return NextResponse.json({
        status: 'running',
        step: nextStep,
        progress,
        message: `Wrote ${chapter.title} - ${section.title}. Progress: ${progress}%`
      })
    }

    // STEP: Finalize
    if (step === 'finalize') {
      // Mark book as final
      await supabase
        .from('books')
        .update({ status: 'final' })
        .eq('id', book.id)

      await updateJob(supabase, jobId, {
        status: 'complete',
        step: 'complete',
        progress: 100,
        completed_at: new Date().toISOString()
      })

      return NextResponse.json({
        status: 'complete',
        step: 'complete',
        progress: 100,
        book_id: book.id,
        message: 'Book generation complete!'
      })
    }

    // Unknown step
    throw new Error(`Unknown step: ${step}`)

  } catch (error) {
    console.error('Tick error:', error)

    await updateJob(supabase, jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
