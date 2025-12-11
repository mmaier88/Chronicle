import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface CrossRefWork {
  DOI: string
  URL: string
  title: string[]
  author?: Array<{
    given?: string
    family?: string
    name?: string
  }>
  abstract?: string
  'container-title'?: string[]
  publisher?: string
  published?: {
    'date-parts'?: number[][]
  }
  type?: string
  ISSN?: string[]
  subject?: string[]
  license?: Array<{
    URL: string
    'content-version'?: string
  }>
  link?: Array<{
    URL: string
    'content-type'?: string
  }>
}

/**
 * POST /api/import/doi - Import paper by DOI
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { doi, project_id } = body

    if (!doi) {
      return NextResponse.json({ error: 'doi is required' }, { status: 400 })
    }

    // Clean up the DOI (handle various formats)
    let cleanDoi = doi.trim()
    cleanDoi = cleanDoi.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, '')
    cleanDoi = cleanDoi.replace(/^doi:/, '')

    // Fetch from CrossRef API
    const apiUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'ResearchBase/1.0 (mailto:support@researchbase.pro)',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'DOI not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to resolve DOI' }, { status: 502 })
    }

    const data = await response.json()
    const work: CrossRefWork = data.message

    // Check if source already exists
    const { data: existing } = await supabase
      .from('sources')
      .select('id')
      .eq('source_type', 'doi')
      .eq('external_id', work.DOI)
      .single()

    if (existing) {
      return NextResponse.json({
        source: existing,
        imported: false,
        message: 'Paper already exists in your library',
      })
    }

    // Extract authors
    const authors = work.author?.map(a => {
      if (a.name) return a.name
      return [a.given, a.family].filter(Boolean).join(' ')
    }) || []

    // Extract publication date
    const dateParts = work.published?.['date-parts']?.[0]
    const publishedDate = dateParts
      ? new Date(dateParts[0], (dateParts[1] || 1) - 1, dateParts[2] || 1).toISOString()
      : null

    // Find PDF link if available
    const pdfLink = work.link?.find(l =>
      l['content-type']?.includes('pdf') || l.URL?.includes('.pdf')
    )

    // Create source record
    const { data: source, error: createError } = await supabase
      .from('sources')
      .insert({
        project_id,
        title: work.title?.[0] || 'Untitled',
        source_type: 'doi',
        external_id: work.DOI,
        url: work.URL || `https://doi.org/${work.DOI}`,
        pdf_url: pdfLink?.URL,
        metadata: {
          doi: work.DOI,
          authors,
          abstract: work.abstract,
          journal: work['container-title']?.[0],
          publisher: work.publisher,
          published: publishedDate,
          type: work.type,
          issn: work.ISSN,
          subjects: work.subject,
        },
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating source:', createError)
      return NextResponse.json({ error: 'Failed to create source' }, { status: 500 })
    }

    return NextResponse.json({
      source,
      imported: true,
      message: 'Paper imported successfully',
    }, { status: 201 })

  } catch (error) {
    console.error('DOI import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/import/doi?doi=... - Lookup DOI metadata without importing
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const doi = searchParams.get('doi')

    if (!doi) {
      return NextResponse.json({ error: 'doi is required' }, { status: 400 })
    }

    // Clean up the DOI
    let cleanDoi = doi.trim()
    cleanDoi = cleanDoi.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, '')
    cleanDoi = cleanDoi.replace(/^doi:/, '')

    // Fetch from CrossRef API
    const apiUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'ResearchBase/1.0 (mailto:support@researchbase.pro)',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'DOI not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to resolve DOI' }, { status: 502 })
    }

    const data = await response.json()
    const work: CrossRefWork = data.message

    // Extract authors
    const authors = work.author?.map(a => {
      if (a.name) return a.name
      return [a.given, a.family].filter(Boolean).join(' ')
    }) || []

    // Extract publication date
    const dateParts = work.published?.['date-parts']?.[0]
    const publishedDate = dateParts
      ? `${dateParts[0]}${dateParts[1] ? '-' + String(dateParts[1]).padStart(2, '0') : ''}${dateParts[2] ? '-' + String(dateParts[2]).padStart(2, '0') : ''}`
      : null

    return NextResponse.json({
      doi: work.DOI,
      title: work.title?.[0],
      authors,
      abstract: work.abstract,
      journal: work['container-title']?.[0],
      publisher: work.publisher,
      published: publishedDate,
      type: work.type,
      url: work.URL || `https://doi.org/${work.DOI}`,
    })

  } catch (error) {
    console.error('DOI lookup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
