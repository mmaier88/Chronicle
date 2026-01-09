import { NextRequest } from 'next/server'
import { getUser, createServiceClient } from '@/lib/supabase/server'
import { success, apiError } from '@/lib/api-response'
import { stripe, isStripeConfigured } from '@/lib/stripe/client'
import { getPrice, editionToMode, isFree, Edition, BookLength } from '@/lib/stripe/pricing'
import { VibePreview, BookGenre, StorySliders, Constitution, DEFAULT_SLIDERS, SliderValue } from '@/types/chronicle'
import { logger } from '@/lib/logger'

// Convert slider value to warning level for display
function sliderToWarning(value: SliderValue): 'none' | 'low' | 'medium' | 'high' {
  if (value === 'auto') return 'low'
  if (value <= 1) return 'none'
  if (value <= 2) return 'low'
  if (value <= 3) return 'medium'
  return 'high'
}

interface CreateCheckoutRequest {
  genre: BookGenre
  prompt: string
  preview: VibePreview
  length: BookLength
  edition: Edition
  sliders?: StorySliders
}

export async function POST(request: NextRequest) {
  const { user } = await getUser()
  if (!user) {
    return apiError.unauthorized()
  }

  let body: CreateCheckoutRequest
  try {
    body = await request.json()
  } catch {
    return apiError.badRequest('Invalid request body')
  }

  const { genre, prompt, preview, length, edition, sliders } = body

  // Validation
  if (!genre || !prompt || !preview || !length || !edition) {
    return apiError.badRequest('Missing required fields: genre, prompt, preview, length, edition')
  }

  if (!['standard', 'masterwork'].includes(edition)) {
    return apiError.badRequest('Invalid edition. Must be "standard" or "masterwork"')
  }

  if (![30, 60, 120, 300].includes(length)) {
    return apiError.badRequest('Invalid length. Must be 30, 60, 120, or 300')
  }

  const { price, priceId } = getPrice(edition, length)
  const mode = editionToMode(edition)

  // Handle free tier - create book and job directly
  if (isFree(edition, length)) {
    logger.info('Free tier checkout - creating book directly', { userId: user.id, edition, length })

    const supabase = createServiceClient()

    // Build preview with metadata
    const userSliders = sliders || DEFAULT_SLIDERS
    const warningsFromSliders = {
      violence: sliderToWarning(userSliders.violence || 'auto'),
      romance: sliderToWarning(userSliders.romance || 'auto'),
    }

    const previewWithMeta = {
      ...preview,
      targetPages: length,
      mode,
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
        owner_id: user.id,
        title: preview.title || 'Untitled',
        genre: genre,
        source: 'vibe',
        core_question: preview.logline || null,
        status: 'drafting',
        constitution_json: emptyConstitution,
        constitution_locked: false,
      })
      .select()
      .single()

    if (bookError || !book) {
      logger.error('Failed to create book for free tier', bookError, { userId: user.id })
      return apiError.internal('Failed to create book')
    }

    // Create vibe job
    const { data: job, error: jobError } = await supabase
      .from('vibe_jobs')
      .insert({
        user_id: user.id,
        book_id: book.id,
        genre: genre,
        user_prompt: prompt,
        preview: previewWithMeta,
        status: 'queued',
        step: 'created',
        progress: 0,
      })
      .select()
      .single()

    if (jobError || !job) {
      logger.error('Failed to create vibe job for free tier', jobError, { userId: user.id, bookId: book.id })
      // Clean up book
      await supabase.from('books').delete().eq('id', book.id)
      return apiError.internal('Failed to create job')
    }

    logger.info('Free tier book and job created', {
      userId: user.id,
      jobId: job.id,
      bookId: book.id,
      edition,
      length,
    })

    return success({
      free: true,
      job_id: job.id,
    })
  }

  // Paid checkout - use Stripe
  if (!priceId) {
    logger.error('Stripe price ID not configured', undefined, { edition, length })
    return apiError.internal('Payment configuration error')
  }

  // Check if Stripe is configured for paid items
  if (!isStripeConfigured()) {
    return apiError.internal('Payment system not configured')
  }

  try {
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/create/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/create/preview?cancelled=true`,
      customer_email: user.email || undefined,
      metadata: {
        user_id: user.id,
        edition,
        book_length: length.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    })

    // Store payment record with preview data for post-payment job creation
    const supabase = createServiceClient()
    const { error: dbError } = await supabase.from('payments').insert({
      user_id: user.id,
      stripe_checkout_session_id: session.id,
      edition,
      book_length: length,
      amount_cents: price,
      preview_data: {
        genre,
        prompt,
        preview,
        length,
        mode,
        sliders: sliders || null,
      },
      status: 'pending',
    })

    if (dbError) {
      logger.error('Failed to create payment record', dbError, { userId: user.id, sessionId: session.id })
      return apiError.internal('Failed to initialize payment')
    }

    logger.info('Checkout session created', {
      userId: user.id,
      sessionId: session.id,
      edition,
      length,
      amount: price,
    })

    return success({
      checkout_url: session.url,
      session_id: session.id,
    })
  } catch (err) {
    logger.error('Stripe checkout creation failed', err, { userId: user.id })
    return apiError.internal('Failed to create checkout session')
  }
}
