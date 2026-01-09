/**
 * Stripe Pricing Configuration
 *
 * Maps edition + length to Stripe price IDs and amounts.
 * Standard Edition = draft mode (fast generation)
 * Masterwork Edition = polished mode + audio
 */

export type Edition = 'standard' | 'masterwork'
export type BookLength = 30 | 60 | 120 | 300

export interface PriceInfo {
  /** Price in cents */
  price: number
  /** Stripe Price ID */
  priceId: string
}

/**
 * Pricing matrix: edition → length → price info
 * Prices are in cents (USD)
 */
export const PRICING: Record<Edition, Record<BookLength, PriceInfo>> = {
  standard: {
    30: { price: 199, priceId: process.env.STRIPE_PRICE_STANDARD_30 || '' },
    60: { price: 399, priceId: process.env.STRIPE_PRICE_STANDARD_60 || '' },
    120: { price: 699, priceId: process.env.STRIPE_PRICE_STANDARD_120 || '' },
    300: { price: 999, priceId: process.env.STRIPE_PRICE_STANDARD_300 || '' },
  },
  masterwork: {
    30: { price: 499, priceId: process.env.STRIPE_PRICE_MASTERWORK_30 || '' },
    60: { price: 799, priceId: process.env.STRIPE_PRICE_MASTERWORK_60 || '' },
    120: { price: 1199, priceId: process.env.STRIPE_PRICE_MASTERWORK_120 || '' },
    300: { price: 1499, priceId: process.env.STRIPE_PRICE_MASTERWORK_300 || '' },
  },
}

/**
 * Length labels for display
 */
export const LENGTH_LABELS: Record<BookLength, { name: string; pages: string }> = {
  30: { name: 'Short Story', pages: '~30 pages' },
  60: { name: 'Novella', pages: '~60 pages' },
  120: { name: 'Novel', pages: '~120 pages' },
  300: { name: 'Epic', pages: '~300 pages' },
}

/**
 * Format price in cents to display string (e.g., 199 → "$1.99")
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Get price info for a given edition and length
 */
export function getPrice(edition: Edition, length: BookLength): PriceInfo {
  return PRICING[edition][length]
}

/**
 * Map edition to generation mode
 * Standard → draft (fast)
 * Masterwork → polished (full pipeline + audio)
 */
export function editionToMode(edition: Edition): 'draft' | 'polished' {
  return edition === 'masterwork' ? 'polished' : 'draft'
}

/**
 * Edition display info
 */
export const EDITION_INFO: Record<Edition, {
  name: string
  tagline: string
  features: string[]
  color: string
}> = {
  standard: {
    name: 'Standard',
    tagline: 'Quality meets speed',
    features: [
      'Full AI-generated story',
      'Professional book cover',
      'EPUB & PDF export',
      'Share with friends',
    ],
    color: 'var(--amber-warm)',
  },
  masterwork: {
    name: 'Masterwork',
    tagline: 'For stories worth keeping',
    features: [
      'Everything in Standard',
      'Enhanced prose polish',
      'Full audiobook narration',
      'Priority generation',
    ],
    color: '#a855f7',
  },
}
