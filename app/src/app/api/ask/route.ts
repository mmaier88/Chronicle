import { createClient } from '@/lib/supabase/server'
import { generateQueryEmbedding } from '@/lib/voyage'
import { NextRequest, NextResponse } from 'next/server'

interface RelevantChunk {
  id: string
  content: string
  source_id: string
  source_title: string
  similarity: number
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
    const { query, projectId, topK = 5 } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query)

    // Search for similar chunks using pgvector
    // Using a raw SQL query for vector similarity search
    const { data: chunks, error: searchError } = await supabase.rpc(
      'match_source_chunks',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: topK,
        p_project_id: projectId || null
      }
    )

    if (searchError) {
      console.error('Search error:', searchError)

      // Fallback: If the RPC doesn't exist, return empty results
      // The RPC function needs to be created in the database
      if (searchError.message.includes('function') || searchError.message.includes('does not exist')) {
        return NextResponse.json({
          query,
          chunks: [],
          answer: null,
          message: 'Vector search function not yet configured. Please run the database migration to add match_source_chunks function.'
        })
      }

      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Format the results
    const relevantChunks: RelevantChunk[] = (chunks || []).map((chunk: {
      id: string
      content: string
      source_id: string
      source_title: string
      similarity: number
    }) => ({
      id: chunk.id,
      content: chunk.content,
      source_id: chunk.source_id,
      source_title: chunk.source_title,
      similarity: chunk.similarity
    }))

    // Build context from relevant chunks
    const context = relevantChunks
      .map((chunk, i) => `[${i + 1}] From "${chunk.source_title}":\n${chunk.content}`)
      .join('\n\n')

    // TODO: Use Anthropic Claude to generate an answer based on the context
    // For now, return the relevant chunks without generating an answer
    const answer = relevantChunks.length > 0
      ? `Based on ${relevantChunks.length} relevant source(s), here's what I found:\n\n${context}\n\n[Claude answer generation pending - add ANTHROPIC_API_KEY]`
      : 'No relevant sources found for your query.'

    return NextResponse.json({
      query,
      chunks: relevantChunks,
      answer,
      sources_count: relevantChunks.length
    })

  } catch (error) {
    console.error('Ask handler error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
