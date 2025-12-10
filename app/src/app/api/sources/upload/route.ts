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

    // TODO: Trigger background job to extract text and create embeddings
    // This would call a Supabase Edge Function or background worker

    return NextResponse.json({
      success: true,
      source: {
        id: source.id,
        title: source.title,
        storage_path: source.storage_path,
        url: urlData.publicUrl,
        processing_status: source.processing_status
      }
    })

  } catch (error) {
    console.error('Upload handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
