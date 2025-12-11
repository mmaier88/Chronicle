import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Simplified article extraction (server-side)
 * In production, you might want to use Mozilla's Readability via JSDOM
 */
function extractArticle(html: string, url: string): {
  title: string
  content: string
  excerpt: string
  author?: string
  publishedDate?: string
  siteName?: string
} {
  // Extract title
  let title = ''
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) title = titleMatch[1].trim()

  // Try Open Graph title
  const ogTitleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
  if (ogTitleMatch) title = ogTitleMatch[1]

  // Extract author
  let author: string | undefined
  const authorMatch = html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i)
  if (authorMatch) author = authorMatch[1]

  // Extract published date
  let publishedDate: string | undefined
  const dateMatch = html.match(/<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"/i)
    || html.match(/<time[^>]+datetime="([^"]+)"/i)
  if (dateMatch) publishedDate = dateMatch[1]

  // Extract site name
  let siteName: string | undefined
  const siteMatch = html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i)
  if (siteMatch) siteName = siteMatch[1]

  // Extract description/excerpt
  let excerpt = ''
  const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)
    || html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)
  if (descMatch) excerpt = descMatch[1]

  // Extract main content (simplified - real implementation would use Readability)
  let content = ''

  // Try to find article element
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (articleMatch) {
    content = articleMatch[1]
  } else {
    // Try main element
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    if (mainMatch) {
      content = mainMatch[1]
    } else {
      // Fallback to body
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      if (bodyMatch) {
        content = bodyMatch[1]
      }
    }
  }

  // Clean content
  content = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Truncate content for storage
  if (content.length > 50000) {
    content = content.slice(0, 50000) + '...'
  }

  return {
    title,
    content,
    excerpt,
    author,
    publishedDate,
    siteName,
  }
}

/**
 * POST /api/import/web - Import web article
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { url, project_id } = body

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Check if already imported
    const { data: existing } = await supabase
      .from('sources')
      .select('id')
      .eq('url', url)
      .single()

    if (existing) {
      return NextResponse.json({
        source: existing,
        imported: false,
        message: 'Article already exists in your library',
      })
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ResearchBase/1.0)',
        'Accept': 'text/html',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.status}` }, { status: 502 })
    }

    const html = await response.text()

    // Extract article content
    const article = extractArticle(html, url)

    if (!article.title) {
      article.title = parsedUrl.hostname + parsedUrl.pathname
    }

    // Create source
    const { data: source, error: createError } = await supabase
      .from('sources')
      .insert({
        project_id,
        title: article.title,
        source_type: 'web',
        url,
        content: article.content,
        metadata: {
          site_name: article.siteName || parsedUrl.hostname,
          author: article.author,
          published_date: article.publishedDate,
          excerpt: article.excerpt,
          imported_at: new Date().toISOString(),
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
      message: 'Article imported successfully',
      article: {
        title: article.title,
        excerpt: article.excerpt,
        author: article.author,
        siteName: article.siteName,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Web import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/import/web?url=... - Preview article metadata without importing
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ResearchBase/1.0)',
        'Accept': 'text/html',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.status}` }, { status: 502 })
    }

    const html = await response.text()
    const article = extractArticle(html, url)

    return NextResponse.json({
      url,
      title: article.title || parsedUrl.hostname + parsedUrl.pathname,
      excerpt: article.excerpt,
      author: article.author,
      publishedDate: article.publishedDate,
      siteName: article.siteName || parsedUrl.hostname,
    })

  } catch (error) {
    console.error('Web preview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
