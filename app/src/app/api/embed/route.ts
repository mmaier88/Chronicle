import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Voyage AI for embeddings
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY

interface EmbedRequest {
  bookId: string
  sectionId: string
  milestoneVersion: 'v1' | 'v2' | 'final'
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'voyage-3',
    }),
  })

  if (!response.ok) {
    throw new Error(`Voyage API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

function chunkText(text: string, maxTokens: number = 800, overlap: number = 100): string[] {
  // Simple character-based chunking (roughly 4 chars per token)
  const maxChars = maxTokens * 4
  const overlapChars = overlap * 4
  const chunks: string[] = []

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/)
  let currentChunk = ''

  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        // Keep overlap from end of previous chunk
        const overlapText = currentChunk.slice(-overlapChars)
        currentChunk = overlapText + '\n\n' + para
      } else {
        // Single paragraph too long, split by sentences
        const sentences = para.match(/[^.!?]+[.!?]+/g) || [para]
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length > maxChars) {
            if (currentChunk) {
              chunks.push(currentChunk.trim())
              currentChunk = currentChunk.slice(-overlapChars) + sentence
            } else {
              // Single sentence too long, just add it
              chunks.push(sentence.trim())
            }
          } else {
            currentChunk += sentence
          }
        }
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!VOYAGE_API_KEY) {
    return NextResponse.json({ error: 'Embedding service not configured' }, { status: 500 })
  }

  const body: EmbedRequest = await request.json()
  const { bookId, sectionId, milestoneVersion } = body

  // Verify ownership and get section
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('*, chapter:chapters(book_id)')
    .eq('id', sectionId)
    .single()

  if (sectionError || !section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 })
  }

  // Verify book ownership
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id')
    .eq('id', bookId)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  // Only embed canonical content
  if (section.status !== 'canonical') {
    return NextResponse.json({ error: 'Only canonical sections can be embedded' }, { status: 400 })
  }

  const contentText = section.content_text
  if (!contentText) {
    return NextResponse.json({ error: 'Section has no content to embed' }, { status: 400 })
  }

  try {
    // Create milestone
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .insert({
        book_id: bookId,
        chapter_id: section.chapter_id,
        section_id: sectionId,
        version: milestoneVersion,
        content_snapshot: section.content_json,
        content_text: contentText,
        embedded: false,
      })
      .select()
      .single()

    if (milestoneError || !milestone) {
      throw new Error('Failed to create milestone')
    }

    // Chunk the content
    const chunks = chunkText(contentText)

    // Generate all embeddings in parallel (batched for rate limits)
    const BATCH_SIZE = 5
    const embeddingRecords: Array<{
      milestone_id: string
      book_id: string
      chunk_index: number
      content: string
      embedding: number[]
    }> = []

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const embeddings = await Promise.all(batch.map(chunk => getEmbedding(chunk)))

      embeddings.forEach((embedding, idx) => {
        embeddingRecords.push({
          milestone_id: milestone.id,
          book_id: bookId,
          chunk_index: i + idx,
          content: batch[idx],
          embedding: embedding,
        })
      })
    }

    // Batch insert all embeddings at once
    if (embeddingRecords.length > 0) {
      const { error: insertError } = await supabase.from('embeddings').insert(embeddingRecords)
      if (insertError) throw insertError
    }

    // Mark milestone as embedded
    await supabase
      .from('milestones')
      .update({
        embedded: true,
        embedded_at: new Date().toISOString(),
      })
      .eq('id', milestone.id)

    return NextResponse.json({
      success: true,
      milestoneId: milestone.id,
      chunksEmbedded: chunks.length,
    })
  } catch (error) {
    console.error('Embedding error:', error)
    return NextResponse.json(
      { error: 'Embedding failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
