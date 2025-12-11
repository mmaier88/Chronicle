import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface ArxivEntry {
  id: string
  title: string
  summary: string
  authors: string[]
  published: string
  updated: string
  pdfUrl: string
  categories: string[]
  doi?: string
}

/**
 * Parse ArXiv Atom XML response
 */
function parseArxivResponse(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = []

  // Simple regex-based parsing (more robust than DOM parsing for this format)
  const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)

  for (const entryMatch of entryMatches) {
    const entryXml = entryMatch[1]

    // Extract ID (e.g., http://arxiv.org/abs/2301.12345v1 -> 2301.12345)
    const idMatch = entryXml.match(/<id>http:\/\/arxiv\.org\/abs\/([^<]+)<\/id>/)
    const id = idMatch?.[1]?.replace(/v\d+$/, '') || ''

    // Extract title (clean up whitespace)
    const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/)
    const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim() || ''

    // Extract summary/abstract
    const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/)
    const summary = summaryMatch?.[1]?.replace(/\s+/g, ' ').trim() || ''

    // Extract authors
    const authors: string[] = []
    const authorMatches = entryXml.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)
    for (const authorMatch of authorMatches) {
      authors.push(authorMatch[1].trim())
    }

    // Extract dates
    const publishedMatch = entryXml.match(/<published>([^<]+)<\/published>/)
    const published = publishedMatch?.[1] || ''

    const updatedMatch = entryXml.match(/<updated>([^<]+)<\/updated>/)
    const updated = updatedMatch?.[1] || ''

    // Extract PDF link
    const pdfMatch = entryXml.match(/<link[^>]+title="pdf"[^>]+href="([^"]+)"/)
    const pdfUrl = pdfMatch?.[1] || `https://arxiv.org/pdf/${id}.pdf`

    // Extract categories
    const categories: string[] = []
    const categoryMatches = entryXml.matchAll(/<category[^>]+term="([^"]+)"/g)
    for (const catMatch of categoryMatches) {
      categories.push(catMatch[1])
    }

    // Extract DOI if available
    const doiMatch = entryXml.match(/<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/)
    const doi = doiMatch?.[1]

    if (id) {
      entries.push({
        id,
        title,
        summary,
        authors,
        published,
        updated,
        pdfUrl,
        categories,
        doi,
      })
    }
  }

  return entries
}

/**
 * POST /api/import/arxiv - Import paper from ArXiv
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { arxiv_id, project_id } = body

    if (!arxiv_id) {
      return NextResponse.json({ error: 'arxiv_id is required' }, { status: 400 })
    }

    // Clean up the ArXiv ID (handle various formats)
    let cleanId = arxiv_id.trim()
    cleanId = cleanId.replace(/^(https?:\/\/)?(arxiv\.org\/abs\/)?/, '')
    cleanId = cleanId.replace(/\.pdf$/, '')
    cleanId = cleanId.replace(/v\d+$/, '') // Remove version suffix

    // Fetch from ArXiv API
    const apiUrl = `http://export.arxiv.org/api/query?id_list=${cleanId}`
    const response = await fetch(apiUrl)

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from ArXiv' }, { status: 502 })
    }

    const xml = await response.text()
    const entries = parseArxivResponse(xml)

    if (entries.length === 0) {
      return NextResponse.json({ error: 'Paper not found on ArXiv' }, { status: 404 })
    }

    const paper = entries[0]

    // Check if source already exists
    const { data: existing } = await supabase
      .from('sources')
      .select('id')
      .eq('source_type', 'arxiv')
      .eq('external_id', paper.id)
      .single()

    if (existing) {
      return NextResponse.json({
        source: existing,
        imported: false,
        message: 'Paper already exists in your library',
      })
    }

    // Create source record
    const { data: source, error: createError } = await supabase
      .from('sources')
      .insert({
        project_id,
        title: paper.title,
        source_type: 'arxiv',
        external_id: paper.id,
        url: `https://arxiv.org/abs/${paper.id}`,
        pdf_url: paper.pdfUrl,
        metadata: {
          arxiv_id: paper.id,
          authors: paper.authors,
          abstract: paper.summary,
          categories: paper.categories,
          published: paper.published,
          updated: paper.updated,
          doi: paper.doi,
        },
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating source:', createError)
      return NextResponse.json({ error: 'Failed to create source' }, { status: 500 })
    }

    // Optionally trigger PDF download and processing
    // This would be done async via a background job in production

    return NextResponse.json({
      source,
      imported: true,
      message: 'Paper imported successfully',
    }, { status: 201 })

  } catch (error) {
    console.error('ArXiv import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/import/arxiv?query=...&max_results=10 - Search ArXiv
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const maxResults = parseInt(searchParams.get('max_results') || '10', 10)

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    // Build search query
    const encodedQuery = encodeURIComponent(query)
    const apiUrl = `http://export.arxiv.org/api/query?search_query=all:${encodedQuery}&start=0&max_results=${Math.min(maxResults, 50)}`

    const response = await fetch(apiUrl)

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to search ArXiv' }, { status: 502 })
    }

    const xml = await response.text()
    const entries = parseArxivResponse(xml)

    // Format results
    const results = entries.map(entry => ({
      arxiv_id: entry.id,
      title: entry.title,
      authors: entry.authors,
      abstract: entry.summary.slice(0, 500) + (entry.summary.length > 500 ? '...' : ''),
      published: entry.published,
      categories: entry.categories,
      pdf_url: entry.pdfUrl,
      url: `https://arxiv.org/abs/${entry.id}`,
    }))

    return NextResponse.json({ results })

  } catch (error) {
    console.error('ArXiv search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
