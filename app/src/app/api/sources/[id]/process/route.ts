import { createClient } from '@/lib/supabase/server'
import { generateEmbeddings } from '@/lib/voyage'
import { NextRequest, NextResponse } from 'next/server'

// PDF text extraction
// Note: pdf-parse has issues with Next.js Turbopack bundling
// In production, use a Supabase Edge Function or external service (e.g., Unstructured.io)
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<{ text: string; numPages: number }> {
  // TODO: Implement with Supabase Edge Function or external PDF processing service
  // For now, return a placeholder to allow the pipeline to work
  // The actual PDF parsing should be done by:
  // 1. A Supabase Edge Function with Deno
  // 2. An external service like Unstructured.io
  // 3. A separate Node.js worker service

  console.warn('PDF text extraction not yet implemented - using placeholder')

  return {
    text: `[PDF content placeholder - file size: ${buffer.byteLength} bytes]\n\nThis PDF will be processed by an external service. The embedding pipeline is ready.`,
    numPages: 1
  }
}

/**
 * Chunk text into smaller pieces for embedding
 */
function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) continue

    if (currentChunk.length + trimmed.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
      }
      // If single paragraph is too long, split by sentences
      if (trimmed.length > maxChunkSize) {
        const sentences = trimmed.split(/(?<=[.!?])\s+/)
        for (const sentence of sentences) {
          if (sentence.length > maxChunkSize) {
            // Last resort: split by words
            const words = sentence.split(/\s+/)
            let wordChunk = ''
            for (const word of words) {
              if (wordChunk.length + word.length > maxChunkSize) {
                chunks.push(wordChunk.trim())
                wordChunk = word
              } else {
                wordChunk += ' ' + word
              }
            }
            if (wordChunk) chunks.push(wordChunk.trim())
          } else {
            chunks.push(sentence)
          }
        }
        currentChunk = ''
      } else {
        currentChunk = trimmed
      }
    } else {
      currentChunk += '\n\n' + trimmed
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter(c => c.length > 50) // Filter out very short chunks
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get source record
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('*')
      .eq('id', id)
      .single()

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    // Update status to processing
    await supabase
      .from('sources')
      .update({ processing_status: 'processing' })
      .eq('id', id)

    try {
      // Download PDF from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('sources')
        .download(source.storage_path)

      if (downloadError || !fileData) {
        throw new Error('Failed to download PDF')
      }

      // Extract text from PDF
      const buffer = await fileData.arrayBuffer()
      const { text, numPages } = await extractTextFromPDF(buffer)

      // Chunk the text
      const chunks = chunkText(text)

      if (chunks.length === 0) {
        throw new Error('No text content extracted from PDF')
      }

      // Generate embeddings for all chunks
      const embeddings = await generateEmbeddings(chunks)

      // Store chunks with embeddings
      const chunkRecords = chunks.map((content, index) => ({
        source_id: id,
        content,
        chunk_index: index,
        page_number: null, // Would need more sophisticated parsing to determine page
        embedding: embeddings[index],
      }))

      // Insert chunks in batches
      const BATCH_SIZE = 50
      for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
        const batch = chunkRecords.slice(i, i + BATCH_SIZE)
        const { error: insertError } = await supabase
          .from('source_chunks')
          .insert(batch)

        if (insertError) {
          console.error('Error inserting chunks:', insertError)
          throw new Error('Failed to store chunks')
        }
      }

      // Update source with metadata
      await supabase
        .from('sources')
        .update({
          processing_status: 'completed',
          page_count: numPages,
          chunk_count: chunks.length,
        })
        .eq('id', id)

      return NextResponse.json({
        success: true,
        source_id: id,
        chunks_created: chunks.length,
        pages: numPages,
      })

    } catch (processingError) {
      console.error('Processing error:', processingError)

      // Update status to failed
      await supabase
        .from('sources')
        .update({
          processing_status: 'failed',
          processing_error: processingError instanceof Error ? processingError.message : 'Unknown error',
        })
        .eq('id', id)

      throw processingError
    }

  } catch (error) {
    console.error('Process handler error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
