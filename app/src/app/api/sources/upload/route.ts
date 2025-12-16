import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
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

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${user.id}/${projectId || 'default'}/${timestamp}-${file.name}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('sources')
      .upload(filename, file, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('sources')
      .getPublicUrl(filename)

    // Create source record in database
    const { data: source, error: dbError } = await supabase
      .from('sources')
      .insert({
        project_id: projectId || null,
        title: file.name.replace('.pdf', ''),
        source_type: 'pdf',
        storage_path: filename,
        file_size: file.size,
        uploaded_by: user.id,
        processing_status: 'pending'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('sources').remove([filename])
      return NextResponse.json({ error: 'Failed to create source record' }, { status: 500 })
    }

    // Auto-trigger processing in background (non-blocking)
    // We use fetch to call the process endpoint, but don't await it
    const processUrl = new URL(`/api/sources/${source.id}/process`, request.url)
    fetch(processUrl.toString(), {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
    }).catch(err => {
      console.error('Failed to trigger processing:', err)
    })

    return NextResponse.json({
      success: true,
      source: {
        id: source.id,
        title: source.title,
        storage_path: source.storage_path,
        url: urlData.publicUrl,
        processing_status: 'processing' // Will be processing soon
      }
    })

  } catch (error) {
    console.error('Upload handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
