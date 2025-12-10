import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // Build query
    let query = supabase
      .from('sources')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: sources, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
    }

    // Add public URLs
    const sourcesWithUrls = sources?.map(source => {
      const { data: urlData } = supabase.storage
        .from('sources')
        .getPublicUrl(source.storage_path)

      return {
        ...source,
        url: urlData.publicUrl
      }
    }) || []

    return NextResponse.json({ sources: sourcesWithUrls })

  } catch (error) {
    console.error('Sources handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
