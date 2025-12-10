import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/documents/[id]/comments/[commentId] - Update comment (resolve, edit)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, content } = body

    // Get existing comment
    const { data: comment, error: fetchError } = await supabase
      .from('document_comments')
      .select('*')
      .eq('id', commentId)
      .eq('document_id', id)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (action === 'resolve') {
      // Resolve the comment
      const { data: updated, error: updateError } = await supabase
        .from('document_comments')
        .update({
          status: 'resolved',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select()
        .single()

      if (updateError) {
        console.error('Error resolving comment:', updateError)
        return NextResponse.json({ error: 'Failed to resolve comment' }, { status: 500 })
      }

      // Log activity
      await supabase.rpc('log_activity', {
        p_action: 'comment.resolve',
        p_document_id: id,
        p_target_type: 'comment',
        p_target_id: commentId,
        p_details: {},
      })

      return NextResponse.json({ comment: updated })

    } else if (action === 'reject') {
      // Reject the suggestion
      const { data: updated, error: updateError } = await supabase
        .from('document_comments')
        .update({
          status: 'rejected',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select()
        .single()

      if (updateError) {
        console.error('Error rejecting suggestion:', updateError)
        return NextResponse.json({ error: 'Failed to reject suggestion' }, { status: 500 })
      }

      // Log activity
      await supabase.rpc('log_activity', {
        p_action: 'suggestion.reject',
        p_document_id: id,
        p_target_type: 'comment',
        p_target_id: commentId,
        p_details: {},
      })

      return NextResponse.json({ comment: updated })

    } else if (action === 'accept' && comment.comment_type === 'suggestion') {
      // Accept the suggestion (the actual text replacement should be done client-side)
      const { data: updated, error: updateError } = await supabase
        .from('document_comments')
        .update({
          status: 'resolved',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select()
        .single()

      if (updateError) {
        console.error('Error accepting suggestion:', updateError)
        return NextResponse.json({ error: 'Failed to accept suggestion' }, { status: 500 })
      }

      // Log activity
      await supabase.rpc('log_activity', {
        p_action: 'suggestion.accept',
        p_document_id: id,
        p_target_type: 'comment',
        p_target_id: commentId,
        p_details: { suggested_text: comment.suggested_text },
      })

      return NextResponse.json({
        comment: updated,
        apply_suggestion: {
          start_offset: comment.start_offset,
          end_offset: comment.end_offset,
          suggested_text: comment.suggested_text,
        }
      })

    } else if (content) {
      // Edit comment content (only author can edit)
      if (comment.author_id !== user.id) {
        return NextResponse.json({ error: 'Only author can edit comment' }, { status: 403 })
      }

      const { data: updated, error: updateError } = await supabase
        .from('document_comments')
        .update({ content })
        .eq('id', commentId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating comment:', updateError)
        return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
      }

      return NextResponse.json({ comment: updated })

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Update comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/documents/[id]/comments/[commentId] - Delete comment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get comment to check ownership
    const { data: comment, error: fetchError } = await supabase
      .from('document_comments')
      .select('author_id')
      .eq('id', commentId)
      .eq('document_id', id)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Only author can delete (admins handled by RLS)
    if (comment.author_id !== user.id) {
      // Check if user is admin/owner (simplified check)
      // Full check would need to join through document -> project -> workspace
      return NextResponse.json({ error: 'Only author can delete comment' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('document_comments')
      .delete()
      .eq('id', commentId)

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_action: 'comment.delete',
      p_document_id: id,
      p_target_type: 'comment',
      p_target_id: commentId,
      p_details: {},
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
