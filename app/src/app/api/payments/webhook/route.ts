import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'
import { Constitution, DEFAULT_SLIDERS, SliderValue } from '@/types/chronicle'

// Disable body parsing - we need the raw body for signature verification
export const runtime = 'nodejs'

// Convert slider value to warning level for display
function sliderToWarning(value: SliderValue): 'none' | 'low' | 'medium' | 'high' {
  if (value === 'auto') return 'low'
  if (value <= 1) return 'none'
  if (value <= 2) return 'low'
  if (value <= 3) return 'medium'
  return 'high'
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    logger.warn('Stripe webhook missing signature')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      logger.info('Processing checkout.session.completed', { sessionId: session.id })

      // Get the payment record
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('stripe_checkout_session_id', session.id)
        .single()

      if (fetchError || !payment) {
        logger.error('Payment record not found for completed session', fetchError, { sessionId: session.id })
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
      }

      // Check if already processed (idempotency)
      if (payment.status === 'completed' && payment.vibe_job_id) {
        logger.info('Payment already processed', { paymentId: payment.id, jobId: payment.vibe_job_id })
        return NextResponse.json({ received: true, already_processed: true })
      }

      const previewData = payment.preview_data as {
        genre: string
        prompt: string
        preview: Record<string, unknown>
        length: number
        mode: 'draft' | 'polished'
        sliders: Record<string, unknown> | null
      }

      // Build preview with metadata (same logic as /api/create/job)
      const userSliders = previewData.sliders || DEFAULT_SLIDERS
      const warningsFromSliders = {
        violence: sliderToWarning((userSliders as Record<string, SliderValue>).violence || 'auto'),
        romance: sliderToWarning((userSliders as Record<string, SliderValue>).romance || 'auto'),
      }

      const previewWithMeta = {
        ...previewData.preview,
        targetPages: previewData.length,
        mode: previewData.mode,
        sliders: userSliders,
        warnings: warningsFromSliders,
      }

      // Create empty constitution shell
      const emptyConstitution: Constitution = {
        central_thesis: null,
        worldview_frame: null,
        narrative_voice: null,
        what_book_is_against: null,
        what_book_refuses_to_do: null,
        ideal_reader: null,
        taboo_simplifications: null,
      }

      // Create book shell
      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert({
          owner_id: payment.user_id,
          title: (previewData.preview as { title?: string }).title || 'Untitled',
          genre: previewData.genre,
          source: 'vibe',
          core_question: (previewData.preview as { logline?: string }).logline || null,
          status: 'drafting',
          constitution_json: emptyConstitution,
          constitution_locked: false,
        })
        .select()
        .single()

      if (bookError || !book) {
        logger.error('Failed to create book from payment', bookError, {
          paymentId: payment.id,
          userId: payment.user_id,
        })
        await supabase
          .from('payments')
          .update({ status: 'failed', error_message: 'Book creation failed' })
          .eq('id', payment.id)
        return NextResponse.json({ error: 'Book creation failed' }, { status: 500 })
      }

      // Create vibe job
      const { data: job, error: jobError } = await supabase
        .from('vibe_jobs')
        .insert({
          user_id: payment.user_id,
          book_id: book.id,
          genre: previewData.genre,
          user_prompt: previewData.prompt,
          preview: previewWithMeta,
          status: 'queued',
          step: 'created',
          progress: 0,
        })
        .select()
        .single()

      if (jobError || !job) {
        logger.error('Failed to create vibe job from payment', jobError, {
          paymentId: payment.id,
          bookId: book.id,
        })
        // Clean up book if job creation fails
        await supabase.from('books').delete().eq('id', book.id)
        await supabase
          .from('payments')
          .update({ status: 'failed', error_message: 'Job creation failed' })
          .eq('id', payment.id)
        return NextResponse.json({ error: 'Job creation failed' }, { status: 500 })
      }

      // Update payment as completed with job reference
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_customer_id: session.customer as string,
          vibe_job_id: job.id,
        })
        .eq('id', payment.id)

      logger.info('Payment completed, book and job created', {
        paymentId: payment.id,
        jobId: job.id,
        bookId: book.id,
        userId: payment.user_id,
        edition: payment.edition,
        amount: payment.amount_cents,
      })
      break
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      logger.info('Checkout session expired', { sessionId: session.id })

      await supabase
        .from('payments')
        .update({ status: 'expired' })
        .eq('stripe_checkout_session_id', session.id)
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      logger.info('Charge refunded', { chargeId: charge.id, paymentIntent: charge.payment_intent })

      if (charge.payment_intent) {
        await supabase
          .from('payments')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', charge.payment_intent)
      }
      break
    }

    default:
      logger.debug('Unhandled webhook event', { type: event.type })
  }

  return NextResponse.json({ received: true })
}
