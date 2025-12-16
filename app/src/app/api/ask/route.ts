import { createClient } from '@/lib/supabase/server'
import { generateQueryEmbedding } from '@/lib/voyage'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface RelevantChunk {
  id: string
  content: string
  source_id: string
  source_title: string
  page_number: number | null
  chunk_index: number
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

    // SECURITY: If projectId is provided, verify user has access to its workspace
    if (projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', projectId)
        .single()

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', project.workspace_id)
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
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
      page_number: number | null
      chunk_index: number
      similarity: number
    }) => ({
      id: chunk.id,
      content: chunk.content,
      source_id: chunk.source_id,
      source_title: chunk.source_title,
      page_number: chunk.page_number,
      chunk_index: chunk.chunk_index,
      similarity: chunk.similarity
    }))

    // Build context from relevant chunks
    const context = relevantChunks
      .map((chunk, i) => `[${i + 1}] From "${chunk.source_title}":\n${chunk.content}`)
      .join('\n\n')

    // Generate answer using Claude if we have relevant chunks
    let answer: string

    if (relevantChunks.length === 0) {
      answer = 'No relevant sources found for your query. Try uploading more sources or rephrasing your question.'
    } else {
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY

      if (!anthropicApiKey) {
        // Fallback if no API key
        answer = `Based on ${relevantChunks.length} relevant source(s), here's what I found:\n\n${context}`
      } else {
        try {
          const anthropic = new Anthropic({ apiKey: anthropicApiKey })

          const systemPrompt = `You are a research assistant helping users understand their uploaded sources.
Your task is to synthesize information from the provided source excerpts to answer the user's question.

Guidelines:
- Only use information from the provided sources
- Cite sources using [1], [2], etc. notation matching the source numbers
- If the sources don't contain enough information to fully answer the question, say so
- Be concise but thorough
- Maintain academic objectivity`

          const userPrompt = `Based on the following excerpts from the user's research sources, answer their question.

QUESTION: ${query}

SOURCES:
${context}

Please provide a well-structured answer with proper citations to the source numbers.`

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [
              { role: 'user', content: userPrompt }
            ],
            system: systemPrompt
          })

          // Extract text from response
          const textContent = response.content.find(block => block.type === 'text')
          answer = textContent ? textContent.text : 'Unable to generate answer.'

        } catch (claudeError) {
          console.error('Claude API error:', claudeError)
          // Fallback to showing raw context
          answer = `Based on ${relevantChunks.length} relevant source(s), here's what I found:\n\n${context}`
        }
      }
    }

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
