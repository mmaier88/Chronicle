import { NextRequest } from 'next/server'
import { getUser, createServiceClient } from '@/lib/supabase/server'
import { success, apiError } from '@/lib/api-response'
import { stripe, isStripeConfigured } from '@/lib/stripe/client'
import { getPrice, editionToMode, Edition, BookLength } from '@/lib/stripe/pricing'
import { VibePreview, BookGenre, StorySliders } from '@/types/chronicle'
import { logger } from '@/lib/logger'

interface CreateCheckoutRequest {
  genre: BookGenre
  prompt: string
  preview: VibePreview
  length: BookLength
  edition: Edition
  sliders?: StorySliders
}

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return apiError.internal('Payment system not configured')
  }

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

  if (!priceId) {
    logger.error('Stripe price ID not configured', undefined, { edition, length })
    return apiError.internal('Payment configuration error')
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
