import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface BibEntry {
  type: string
  key: string
  title?: string
  author?: string
  year?: string
  journal?: string
  booktitle?: string
  publisher?: string
  volume?: string
  number?: string
  pages?: string
  doi?: string
  url?: string
  abstract?: string
  keywords?: string
  [key: string]: string | undefined
}

/**
 * Parse BibTeX string into entries
 */
function parseBibtex(bibtex: string): BibEntry[] {
  const entries: BibEntry[] = []

  // Match @type{key, ...}
  const entryRegex = /@(\w+)\s*\{\s*([^,\s]+)\s*,([^@]*)/g
  let match

  while ((match = entryRegex.exec(bibtex)) !== null) {
    const type = match[1].toLowerCase()
    const key = match[2].trim()
    const fieldsStr = match[3]

    const entry: BibEntry = { type, key }

    // Parse fields
    // Handle both field = {value} and field = "value" formats
    const fieldRegex = /(\w+)\s*=\s*(?:\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|"([^"]*)"|(\d+))/g
    let fieldMatch

    while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
      const fieldName = fieldMatch[1].toLowerCase()
      const value = fieldMatch[2] || fieldMatch[3] || fieldMatch[4] || ''
      entry[fieldName] = value.trim()
    }

    entries.push(entry)
  }

  return entries
}

/**
 * Parse BibTeX author string into array of names
 */
function parseAuthors(authorStr: string): string[] {
  if (!authorStr) return []

  // Split by ' and '
  const authors = authorStr.split(/\s+and\s+/i)

  return authors.map(author => {
    // Handle "Last, First" format
    if (author.includes(',')) {
      const parts = author.split(',').map(p => p.trim())
      return [parts[1], parts[0]].filter(Boolean).join(' ')
    }
    return author.trim()
  }).filter(Boolean)
}

/**
 * POST /api/import/bibtex - Import sources from BibTeX
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bibtex, project_id } = body

    if (!bibtex) {
      return NextResponse.json({ error: 'bibtex content is required' }, { status: 400 })
    }

    // Parse BibTeX
    const entries = parseBibtex(bibtex)

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No valid BibTeX entries found' }, { status: 400 })
    }

    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
      sources: [] as Array<{ id: string; title: string }>,
      errors: [] as Array<{ key: string; error: string }>,
    }

    for (const entry of entries) {
      try {
        // Skip if no title
        if (!entry.title) {
          results.skipped++
          continue
        }

        // Check for duplicates by DOI or title
        if (entry.doi) {
          const { data: existing } = await supabase
            .from('sources')
            .select('id')
            .eq('external_id', entry.doi)
            .single()

          if (existing) {
            results.skipped++
            continue
          }
        }

        // Determine source type
        let sourceType = 'paper'
        if (entry.type === 'book') sourceType = 'book'
        else if (entry.type === 'inproceedings' || entry.type === 'conference') sourceType = 'conference'
        else if (entry.type === 'misc' || entry.type === 'online') sourceType = 'web'
        else if (entry.type === 'phdthesis' || entry.type === 'mastersthesis') sourceType = 'thesis'

        // Build URL
        let url = entry.url
        if (!url && entry.doi) {
          url = `https://doi.org/${entry.doi}`
        }

        // Create source
        const { data: source, error: createError } = await supabase
          .from('sources')
          .insert({
            project_id,
            title: entry.title,
            source_type: sourceType,
            external_id: entry.doi || `bibtex:${entry.key}`,
            url,
            metadata: {
              bibtex_key: entry.key,
              bibtex_type: entry.type,
              authors: parseAuthors(entry.author || ''),
              year: entry.year,
              journal: entry.journal || entry.booktitle,
              publisher: entry.publisher,
              volume: entry.volume,
              number: entry.number,
              pages: entry.pages,
              doi: entry.doi,
              abstract: entry.abstract,
              keywords: entry.keywords?.split(',').map(k => k.trim()),
            },
          })
          .select('id, title')
          .single()

        if (createError) {
          results.failed++
          results.errors.push({ key: entry.key, error: createError.message })
        } else {
          results.imported++
          results.sources.push(source)
        }
      } catch (err) {
        results.failed++
        results.errors.push({
          key: entry.key,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      total: entries.length,
      ...results,
    }, { status: results.imported > 0 ? 201 : 200 })

  } catch (error) {
    console.error('BibTeX import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
