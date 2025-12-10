import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface EvidenceResult {
  id: string
  content: string
  sourceId: string
  sourceTitle: string
  chunkIndex: number
  similarity: number
  pageNumber?: number
}

// POST - Find evidence for a claim/query
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, projectId, limit = 5, threshold = 0.5 } = body

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Generate embedding for the query using Voyage AI
    const voyageApiKey = process.env.VOYAGE_API_KEY
    if (!voyageApiKey) {
      return NextResponse.json({ error: 'Voyage API key not configured' }, { status: 500 })
    }

    const embeddingResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${voyageApiKey}`
      },
      body: JSON.stringify({
        model: 'voyage-2',
        input: [query],
        input_type: 'query'
      })
    })

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text()
      console.error('Voyage API error:', errorText)
      return NextResponse.json({ error: 'Failed to generate query embedding' }, { status: 500 })
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding

    // Search for similar chunks using pgvector
    const { data: chunks, error: searchError } = await supabase.rpc('match_source_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      p_project_id: projectId || null
    })

    if (searchError) {
      console.error('Search error:', searchError)
      // If the function doesn't exist, fall back to direct query
      const { data: fallbackChunks, error: fallbackError } = await supabase
        .from('source_chunks')
        .select(`
          id,
          content,
          chunk_index,
          source_id,
          sources!inner(id, title, project_id)
        `)
        .limit(limit)

      if (fallbackError) {
        return NextResponse.json({ error: 'Search failed' }, { status: 500 })
      }

      // Format fallback results (without similarity scores)
      const results: EvidenceResult[] = (fallbackChunks || []).map((chunk: any) => ({
        id: chunk.id,
        content: chunk.content,
        sourceId: chunk.source_id,
        sourceTitle: chunk.sources?.title || 'Unknown Source',
        chunkIndex: chunk.chunk_index,
        similarity: 0.5, // Default score
        pageNumber: Math.floor(chunk.chunk_index / 3) + 1 // Estimate page
      }))

      return NextResponse.json({ evidence: results })
    }

    // Format results with source information
    const results: EvidenceResult[] = await Promise.all(
      (chunks || []).map(async (chunk: any) => {
        // Fetch source title
        const { data: source } = await supabase
          .from('sources')
          .select('title')
          .eq('id', chunk.source_id)
          .single()

        return {
          id: chunk.id,
          content: chunk.content,
          sourceId: chunk.source_id,
          sourceTitle: source?.title || 'Unknown Source',
          chunkIndex: chunk.chunk_index,
          similarity: chunk.similarity,
          pageNumber: Math.floor(chunk.chunk_index / 3) + 1 // Estimate page from chunk index
        }
      })
    )

    return NextResponse.json({ evidence: results })

  } catch (error) {
    console.error('Evidence find error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
