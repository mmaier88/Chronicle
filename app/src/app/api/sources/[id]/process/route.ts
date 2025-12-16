import { createClient } from '@/lib/supabase/server'
import { generateEmbeddings } from '@/lib/voyage'
import { NextRequest, NextResponse } from 'next/server'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

// Initialize PDF.js without worker for serverless environment
pdfjsLib.GlobalWorkerOptions.workerSrc = ''

/**
 * Extract text from a PDF using PDF.js
 */
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<{ text: string; numPages: number; pageTexts: string[] }> {
  try {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    })

    const pdf = await loadingTask.promise
    const numPages = pdf.numPages
    const pageTexts: string[] = []

    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()

      // Combine text items, preserving some structure
      let lastY: number | null = null
      let pageText = ''

      for (const item of textContent.items) {
        if ('str' in item) {
          const textItem = item as { str: string; transform: number[] }
          const currentY = textItem.transform[5]

          // Add newline if we've moved to a new line (Y position changed significantly)
          if (lastY !== null && Math.abs(currentY - lastY) > 5) {
            pageText += '\n'
          } else if (pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' '
          }

          pageText += textItem.str
          lastY = currentY
        }
      }

      pageTexts.push(pageText.trim())
    }

    // Combine all pages with clear page breaks
    const text = pageTexts
      .map((pageText, idx) => `[Page ${idx + 1}]\n${pageText}`)
      .join('\n\n')

    return { text, numPages, pageTexts }
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

interface ChunkWithPage {
  content: string
  pageNumber: number
}

/**
 * Chunk text by pages, preserving page information
 */
function chunkTextByPages(pageTexts: string[], maxChunkSize: number = 1000): ChunkWithPage[] {
  const chunks: ChunkWithPage[] = []

  for (let pageNum = 0; pageNum < pageTexts.length; pageNum++) {
    const pageText = pageTexts[pageNum]
    if (!pageText.trim()) continue

    const paragraphs = pageText.split(/\n\n+/)
    let currentChunk = ''

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim()
      if (!trimmed || trimmed.length < 20) continue

      if (currentChunk.length + trimmed.length > maxChunkSize) {
        if (currentChunk.trim().length > 50) {
          chunks.push({ content: currentChunk.trim(), pageNumber: pageNum + 1 })
        }
        // Handle long paragraphs
        if (trimmed.length > maxChunkSize) {
          const sentences = trimmed.split(/(?<=[.!?])\s+/)
          let sentenceChunk = ''
          for (const sentence of sentences) {
            if (sentenceChunk.length + sentence.length > maxChunkSize) {
              if (sentenceChunk.trim().length > 50) {
                chunks.push({ content: sentenceChunk.trim(), pageNumber: pageNum + 1 })
              }
              sentenceChunk = sentence
            } else {
              sentenceChunk += ' ' + sentence
            }
          }
          if (sentenceChunk.trim().length > 50) {
            chunks.push({ content: sentenceChunk.trim(), pageNumber: pageNum + 1 })
          }
          currentChunk = ''
        } else {
          currentChunk = trimmed
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmed
      }
    }

    // Push remaining content from this page
    if (currentChunk.trim().length > 50) {
      chunks.push({ content: currentChunk.trim(), pageNumber: pageNum + 1 })
    }
  }

  return chunks
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

    // Get source record with project/workspace info
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select(`
        *,
        projects!inner(workspace_id)
      `)
      .eq('id', id)
      .single()

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    // SECURITY: Verify user has access to this source's workspace
    const workspaceId = (source.projects as { workspace_id: string }).workspace_id
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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
      const { numPages, pageTexts } = await extractTextFromPDF(buffer)

      // Chunk the text by pages
      const chunks = chunkTextByPages(pageTexts)

      if (chunks.length === 0) {
        throw new Error('No text content extracted from PDF')
      }

      // Generate embeddings for all chunks
      const chunkContents = chunks.map(c => c.content)
      const embeddings = await generateEmbeddings(chunkContents)

      // Store chunks with embeddings and page numbers
      const chunkRecords = chunks.map((chunk, index) => ({
        source_id: id,
        content: chunk.content,
        chunk_index: index,
        page_number: chunk.pageNumber,
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
