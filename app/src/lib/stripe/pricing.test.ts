import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getPrice, isFree, PRICING, formatPrice } from './pricing'

describe('Stripe Pricing', () => {
  describe('getPrice reads env vars at runtime', () => {
    const originalEnv = { ...process.env }

    beforeEach(() => {
      // Clear all Stripe price env vars
      delete process.env.STRIPE_PRICE_STANDARD_60
      delete process.env.STRIPE_PRICE_STANDARD_120
      delete process.env.STRIPE_PRICE_STANDARD_300
      delete process.env.STRIPE_PRICE_MASTERWORK_30
      delete process.env.STRIPE_PRICE_MASTERWORK_60
      delete process.env.STRIPE_PRICE_MASTERWORK_120
      delete process.env.STRIPE_PRICE_MASTERWORK_300
    })

    afterEach(() => {
      // Restore original env
      process.env = { ...originalEnv }
    })

    it('returns empty priceId when env var is not set', () => {
      const result = getPrice('masterwork', 30)
      expect(result.price).toBe(499)
      expect(result.priceId).toBe('')
    })

    it('returns priceId from env var when set at runtime', () => {
      // Set env var AFTER module load (simulating runtime)
      process.env.STRIPE_PRICE_MASTERWORK_30 = 'price_test_masterwork_30'

      const result = getPrice('masterwork', 30)
      expect(result.price).toBe(499)
      expect(result.priceId).toBe('price_test_masterwork_30')
    })

    it('reads different env vars for different editions and lengths', () => {
      process.env.STRIPE_PRICE_STANDARD_60 = 'price_std_60'
      process.env.STRIPE_PRICE_MASTERWORK_120 = 'price_mw_120'

      expect(getPrice('standard', 60).priceId).toBe('price_std_60')
      expect(getPrice('masterwork', 120).priceId).toBe('price_mw_120')
      expect(getPrice('standard', 120).priceId).toBe('') // not set
    })

    it('reflects env var changes between calls (runtime behavior)', () => {
      // First call - no env var
      expect(getPrice('masterwork', 60).priceId).toBe('')

      // Set env var
      process.env.STRIPE_PRICE_MASTERWORK_60 = 'price_updated'

      // Second call - should see the new value
      expect(getPrice('masterwork', 60).priceId).toBe('price_updated')
    })
  })

  describe('isFree', () => {
    it('returns true for standard 30 pages (free tier)', () => {
      expect(isFree('standard', 30)).toBe(true)
    })

    it('returns false for paid tiers', () => {
      expect(isFree('standard', 60)).toBe(false)
      expect(isFree('standard', 120)).toBe(false)
      expect(isFree('masterwork', 30)).toBe(false)
      expect(isFree('masterwork', 60)).toBe(false)
    })
  })

  describe('PRICING export (client-safe)', () => {
    it('contains only price, not priceId', () => {
      // PRICING is for client-side display, should not contain Stripe IDs
      const standardPrice = PRICING.standard[60]
      expect(standardPrice).toHaveProperty('price')
      expect(standardPrice).not.toHaveProperty('priceId')
    })

    it('has correct price values', () => {
      expect(PRICING.standard[30].price).toBe(0)
      expect(PRICING.standard[60].price).toBe(399)
      expect(PRICING.masterwork[30].price).toBe(499)
      expect(PRICING.masterwork[300].price).toBe(1499)
    })
  })

  describe('formatPrice', () => {
    it('formats zero as Free', () => {
      expect(formatPrice(0)).toBe('Free')
    })

    it('formats cents to dollars', () => {
      expect(formatPrice(399)).toBe('$3.99')
      expect(formatPrice(1499)).toBe('$14.99')
      expect(formatPrice(100)).toBe('$1.00')
    })
  })
})
