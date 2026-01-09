/**
 * Stripe Client Configuration
 * Uses lazy initialization to avoid build-time errors when STRIPE_SECRET_KEY is not set
 */

import Stripe from 'stripe'

// Lazy-initialize Stripe client
let _stripe: Stripe | null = null

/**
 * Get the Stripe client instance (lazy initialization)
 */
export function getStripeClient(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }
  return _stripe
}

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

// Export stripe getter as a property for backwards compatibility
// This will throw at runtime if STRIPE_SECRET_KEY is not set, but NOT at build time
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripeClient()[prop as keyof Stripe]
  }
})
