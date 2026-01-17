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
 * Base pricing matrix: edition → length → price (cents)
 * Price IDs are read at runtime via getPrice() to ensure env vars are available
 */
const BASE_PRICING: Record<Edition, Record<BookLength, number>> = {
  standard: {
    30: 0, // Free tier!
    60: 399,
    120: 699,
    300: 999,
  },
  masterwork: {
    30: 499,
    60: 799,
    120: 1199,
    300: 1499,
  },
}

/**
 * Get Stripe price ID for a given edition and length
 * Reads environment variables at runtime (not build time)
 */
function getStripePriceId(edition: Edition, length: BookLength): string {
  const key = `STRIPE_PRICE_${edition.toUpperCase()}_${length}`
  return process.env[key] || ''
}

/**
 * Client-safe pricing for display purposes (no Stripe IDs)
 * Use getPrice() on the server for full price info including Stripe IDs
 */
export const PRICING: Record<Edition, Record<BookLength, { price: number }>> = {
  standard: {
    30: { price: 0 },
    60: { price: 399 },
    120: { price: 699 },
    300: { price: 999 },
  },
  masterwork: {
    30: { price: 499 },
    60: { price: 799 },
    120: { price: 1199 },
    300: { price: 1499 },
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
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Check if a price is free
 */
export function isFree(edition: Edition, length: BookLength): boolean {
  return BASE_PRICING[edition][length] === 0
}

/**
 * Get price info for a given edition and length
 * Reads Stripe price IDs at runtime (not build time)
 */
export function getPrice(edition: Edition, length: BookLength): PriceInfo {
  return {
    price: BASE_PRICING[edition][length],
    priceId: getStripePriceId(edition, length),
  }
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
