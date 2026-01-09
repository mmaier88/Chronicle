import { NextRequest } from 'next/server'
import { getUser, createServiceClient } from '@/lib/supabase/server'
import { success, apiError } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { user } = await getUser()
  if (!user) {
    return apiError.unauthorized()
  }

  const { sessionId } = await params

  if (!sessionId) {
    return apiError.badRequest('Session ID required')
  }

  const supabase = createServiceClient()

  const { data: payment, error } = await supabase
    .from('payments')
    .select('status, vibe_job_id, error_message, edition, book_length, amount_cents')
    .eq('stripe_checkout_session_id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (error || !payment) {
    return apiError.notFound('Payment not found')
  }

  return success({
    status: payment.status,
    job_id: payment.vibe_job_id,
    error: payment.error_message,
    edition: payment.edition,
    book_length: payment.book_length,
    amount_cents: payment.amount_cents,
  })
}
