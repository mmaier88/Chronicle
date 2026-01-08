import { createClient, getUser, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { VibePreview, Constitution, VibeChapterPlan, StorySliders, ResolvedSliders, DEFAULT_SLIDERS } from '@/types/chronicle'
import { PROSE_SYSTEM_PROMPT, PROSE_QUALITY_CHECKLIST } from '@/lib/prose-guidelines'
import { QUICK_POLISH_PROMPT } from '@/lib/polish-pipeline'
import { sendBookCompletedEmail } from '@/lib/email'
import { markdownToHtmlParagraphs } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { resolveSliders } from '@/lib/slider-resolution'
import { SLIDER_CONFIG } from '@/lib/slider-config'

const anthropic = new Anthropic()

const MAX_RETRIES = 3

// Slider-specific directives for high values (4-5)
const SLIDER_DIRECTIVES: Record<keyof ResolvedSliders, { high: string; extreme: string }> = {
  violence: {
    high: 'Include visceral violence with real consequences. Show the impact.',
    extreme: 'Include brutal, graphic violence. Blood, pain, gore. Do not sanitize.',
  },
  romance: {
    high: 'Include passionate, sensual scenes with clear physical intimacy.',
    extreme: 'Include explicit erotic scenes with physical detail and emotional intensity.',
  },
  tone: {
    high: 'Maintain a heavy, somber atmosphere throughout. Loss and grief are central.',
    extreme: 'Make the tone bleak and devastating. No false hope or easy comfort.',
  },
  darkness: {
    high: 'Explore bleak themes and moral despair. The world is harsh.',
    extreme: 'Embrace grimdark nihilism. Hope is scarce, suffering is real.',
  },
  emotionalIntensity: {
    high: 'Write deeply felt, raw emotional scenes. Make it hurt.',
    extreme: 'Overwhelming emotional catharsis. Readers should feel devastated.',
  },
  languageComplexity: {
    high: 'Use rich, layered prose with literary devices and complex sentences.',
    extreme: 'Employ dense, experimental prose. Challenge the reader linguistically.',
  },
  plotComplexity: {
    high: 'Weave a complex narrative with multiple intertwining threads.',
    extreme: 'Create a labyrinthine, non-linear structure. Trust the reader.',
  },
  pacing: {
    high: 'Keep the pace brisk and propulsive. Minimal breathing room.',
    extreme: 'Breakneck pacing. Relentless momentum. No rest for the reader.',
  },
  realism: {
    high: 'Ground everything in realistic consequences. Actions have weight.',
    extreme: 'Unflinching documentary-like realism. No fantasy or convenient escapes.',
  },
  worldDetail: {
    high: 'Create an immersive, richly detailed world. Every scene is textured.',
    extreme: 'Encyclopedic world-building depth. The setting is a character.',
  },
  characterDepth: {
    high: 'Deeply realized characters with rich inner lives and contradictions.',
    extreme: 'Psychologically complex characters. Explore their depths relentlessly.',
  },
  moralClarity: {
    high: 'No easy answers. Every choice has moral weight and ambiguity.',
    extreme: 'Deliberately unsettling moral landscape. Right and wrong blur completely.',
  },
  shockValue: {
    high: 'Include disturbing moments that linger. Push boundaries.',
    extreme: 'Transgressive, boundary-pushing content. Shock is a tool.',
  },
  explicitSafeguard: {
    high: 'Mature NC-17 content is expected. Do not self-censor.',
    extreme: 'Explicit/unrestricted content. Write what the story demands.',
  },
}

// Build slider constraint block for LLM prompts
function buildSliderConstraints(sliders: ResolvedSliders): string {
  const lines: string[] = []

  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('MANDATORY CONTENT DIRECTIVES - THE USER HAS EXPLICITLY REQUESTED:')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('')

  // Process ALL sliders with forceful directives for high values
  const allSliders: Array<keyof ResolvedSliders> = [
    'violence', 'romance', 'tone', 'darkness', 'emotionalIntensity',
    'languageComplexity', 'plotComplexity', 'pacing', 'realism',
    'worldDetail', 'characterDepth', 'moralClarity', 'shockValue', 'explicitSafeguard'
  ]

  for (const key of allSliders) {
    const config = SLIDER_CONFIG[key]
    const value = sliders[key]
    const desc = config.descriptions[value]
    const directives = SLIDER_DIRECTIVES[key]

    if (value >= 4) {
      lines.push(`🔴 ${config.name.toUpperCase()} LEVEL ${value}/5: ${desc}`)
      lines.push(`   YOU MUST actively incorporate this. This is not optional.`)
      lines.push(`   ${value === 5 ? directives.extreme : directives.high}`)
      lines.push('')
    } else if (value <= 2) {
      lines.push(`🔵 ${config.name}: ${value}/5 – ${desc} (keep it restrained)`)
    } else {
      lines.push(`${config.name}: ${value}/5 – ${desc}`)
    }
  }

  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('These are the user\'s EXPLICIT creative choices. Respect them.')
  lines.push('High values (4-5) = ACTIVELY include this content.')
  lines.push('Low values (1-2) = Actively AVOID or minimize this content.')
  lines.push('Write the content they asked for. This is their story.')
  lines.push('═══════════════════════════════════════════════════════════════')

  return lines.join('\n')
}

// Robust JSON parser that handles common AI output issues
function parseAIJson<T>(text: string): T {
  // Extract JSON from markdown code blocks
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                   text.match(/```\s*([\s\S]*?)\s*```/) ||
                   [null, text]
  let jsonStr = (jsonMatch[1] || text).trim()

  // Try direct parse first
  try {
    return JSON.parse(jsonStr)
  } catch {
    // Try to fix common issues
  }

  // Fix unescaped newlines in strings
  jsonStr = jsonStr.replace(/(?<="[^"]*)\n(?=[^"]*")/g, '\\n')

  // Fix unescaped quotes inside strings (naive approach)
  // This replaces \" that aren't already escaped
  jsonStr = jsonStr.replace(/([^\\])"(?=[^:,\[\]{}\s])/g, '$1\\"')

  try {
    return JSON.parse(jsonStr)
  } catch {
    // Last resort: try to extract key content manually
  }

  // For prose responses, try to extract just the prose
  const proseMatch = text.match(/"prose"\s*:\s*"([\s\S]*?)"\s*,\s*"synopsis/)
  if (proseMatch) {
    const synopsisMatch = text.match(/"synopsis"\s*:\s*"([\s\S]*?)"\s*}/)
    if (synopsisMatch) {
      return {
        prose: proseMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
        synopsis: synopsisMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
      } as T
    }
  }

  // If all else fails, throw with the original text for debugging
  throw new Error(`Failed to parse JSON: ${text.substring(0, 200)}...`)
}

// Book length configurations
type BookLength = 30 | 60 | 120 | 300
type GenerationMode = 'draft' | 'polished'

interface BookConfig {
  wordCount: number
  chapters: number
  sectionsPerChapter: number
  wordsPerSection: number
}

function getBookConfig(targetPages: BookLength): BookConfig {
  switch (targetPages) {
    case 30:
      return { wordCount: 8500, chapters: 7, sectionsPerChapter: 2, wordsPerSection: 600 }
    case 60:
      return { wordCount: 17000, chapters: 12, sectionsPerChapter: 2, wordsPerSection: 700 }
    case 120:
      return { wordCount: 34000, chapters: 20, sectionsPerChapter: 2, wordsPerSection: 850 }
    case 300:
      return { wordCount: 85000, chapters: 35, sectionsPerChapter: 3, wordsPerSection: 800 }
    default:
      return { wordCount: 8500, chapters: 7, sectionsPerChapter: 2, wordsPerSection: 600 }
  }
}

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
  return parseAIJson<Constitution>(text)
}

// Generate chapter/section plan
async function generatePlan(preview: VibePreview, constitution: Constitution, config: BookConfig): Promise<VibeChapterPlan[]> {
  const targetPages = (preview as VibePreview & { targetPages?: number }).targetPages || 30

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are planning a ~${targetPages} page book (${config.wordCount} words total) with ${config.chapters} chapters.
Each chapter has ${config.sectionsPerChapter} sections, each ~${config.wordsPerSection} words.

Return ONLY valid JSON array:
[
  {
    "title": "Chapter title",
    "purpose": "What this chapter accomplishes",
    "sections": [
      { "title": "Section title", "goal": "What happens/is explored", "target_words": ${config.wordsPerSection} }
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
  return parseAIJson<VibeChapterPlan[]>(text)
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
  storySynopsis: string | null,
  resolvedSliders: ResolvedSliders
): Promise<{ prose: string; synopsis: string }> {
  const context = previousSections.length > 0
    ? `Previous sections:\n${previousSections.slice(-2).join('\n\n---\n\n')}`
    : 'This is the opening of the book.'

  const sliderBlock = buildSliderConstraints(resolvedSliders)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are a literary fiction writer crafting a section of a book. Your prose must feel human-authored, not AI-generated.

${sliderBlock}

${PROSE_SYSTEM_PROMPT}

BOOK-SPECIFIC GUIDANCE:
Voice: ${constitution.narrative_voice}
Theme: ${constitution.central_thesis}
Avoid: ${constitution.taboo_simplifications}

Write approximately ${targetWords} words.

${PROSE_QUALITY_CHECKLIST}

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
Setting: ${preview.setting}

Remember: Ground every moment in sensory detail. End on action or image, not explanation. Make dialogue messy and human. Vary your sentence rhythm.`
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return parseAIJson<{ prose: string; synopsis: string }>(text)
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
  return parseAIJson<{ passed: boolean; issues: string[] }>(text)
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

${PROSE_SYSTEM_PROMPT}

Voice: ${constitution.narrative_voice}
Goal: ${sectionGoal}

REVISION FOCUS:
1. Fix the specific issues listed
2. Add sensory detail to any paragraph missing it
3. If any paragraph ends on a "realization" or moral, replace with action/image
4. Ensure dialogue has pauses, stutters, or interruptions
5. Vary sentence rhythm

Return ONLY the rewritten prose, no JSON wrapper.`,
    messages: [{
      role: 'user',
      content: `Original section:
${prose}

Issues to fix:
${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

Remember: The rewrite should feel MORE human, not less. Ground abstractions in physical reality.`
    }],
  })

  return message.content[0].type === 'text' ? message.content[0].text : prose
}

// Apply last 10% polish to prose
async function polishProse(
  prose: string,
  characters: { name: string; tagline: string }[]
): Promise<string> {
  const characterContext = characters.length > 0
    ? `\n\nCHARACTERS TO ADD MESS BEATS FOR:\n${characters.map(c => `- ${c.name}: ${c.tagline}`).join('\n')}`
    : ''

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `${QUICK_POLISH_PROMPT}${characterContext}`,
    messages: [{
      role: 'user',
      content: `Polish this prose:\n\n${prose}`
    }],
  })

  return message.content[0].type === 'text'
    ? message.content[0].text.trim()
    : prose
}


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const { user, isDevUser } = await getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = isDevUser ? createServiceClient() : await createClient()

  // Fetch job
  const { data: job, error: jobError } = await supabase
    .from('vibe_jobs')
    .select('id, user_id, book_id, genre, user_prompt, preview, status, step, progress, story_synopsis, error, attempt')
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
    // Reset job to allow retry from current step
    await updateJob(supabase, jobId, {
      status: 'running',
      error: null,
      attempt: 0
    })
    // Continue with the current step
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
      .select('id, title, genre, status, constitution_json, owner_id, cover_status')
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
          constitution_locked_at: new Date().toISOString(),
          cover_status: 'generating'
        })
        .eq('id', book.id)

      // Trigger async cover generation early (non-blocking)
      // Cover generates in parallel with chapter planning and writing
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      fetch(`${baseUrl}/api/cover/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id })
      }).catch(err => {
        logger.error('Cover generation trigger failed', err, { bookId: book.id, operation: 'cover_trigger' })
      })

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
      const targetPages = ((preview as VibePreview & { targetPages?: number }).targetPages || 30) as BookLength
      const bookConfig = getBookConfig(targetPages)
      const plan = await generatePlan(preview, constitution, bookConfig)

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

      // Extract and resolve sliders
      const rawSliders = ((preview as VibePreview & { sliders?: StorySliders }).sliders || DEFAULT_SLIDERS) as StorySliders
      const resolvedSliders = resolveSliders(rawSliders, vibeJob.genre as 'literary_fiction' | 'non_fiction')

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
        vibeJob.story_synopsis,
        resolvedSliders
      )

      let finalProse = result.prose

      // Get mode from preview (default to draft for speed)
      const mode = ((preview as VibePreview & { mode?: GenerationMode }).mode || 'draft') as GenerationMode

      if (mode === 'polished') {
        // POLISHED MODE: Full consistency check, rewrite, and polish pipeline
        const consistency = await checkConsistency(result.prose, constitution, prevTexts)

        // Rewrite if issues (up to MAX_RETRIES)
        if (!consistency.passed && vibeJob.attempt < MAX_RETRIES) {
          finalProse = await rewriteSection(result.prose, consistency.issues, constitution, section.goal || '')
          await updateJob(supabase, jobId, { attempt: vibeJob.attempt + 1 })
        }

        // Apply last 10% polish pass
        finalProse = await polishProse(finalProse, preview.cast)
      }
      // DRAFT MODE: Skip consistency check, rewrite, and polish for 2x faster generation

      // Convert to HTML and save
      const htmlContent = markdownToHtmlParagraphs(finalProse)

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
      // Mark book as final (cover generation was already triggered at constitution step)
      await supabase
        .from('books')
        .update({
          status: 'final'
        })
        .eq('id', book.id)

      // Send book completion email (non-blocking)
      if (user?.email && !isDevUser) {
        const fullUser = user as { email: string; user_metadata?: { full_name?: string; name?: string } }
        const userName = fullUser.user_metadata?.full_name || fullUser.user_metadata?.name || ''
        sendBookCompletedEmail(user.email, userName, book.title, book.id).catch(err => {
          logger.error('Book completion email failed', err, { bookId: book.id, userId: user.id, operation: 'completion_email' })
        })
      }

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
    logger.error('Tick error', error, { jobId, operation: 'tick' })

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
