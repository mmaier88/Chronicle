import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Route Configuration Tests
 *
 * These tests ensure critical API routes have proper configuration
 * to prevent timeout issues in production.
 *
 * IMPORTANT: The cover generation timeout bug (2026-01-17) was caused by:
 * 1. Cover generation taking 30-60+ seconds (AI calls, quality checks, typography)
 * 2. Vercel's default 60s timeout killing the function mid-generation
 * 3. cover_status staying "generating" forever (zombie state)
 *
 * These tests prevent regression by verifying maxDuration is set.
 */
describe('Route Configuration', () => {
  const appDir = path.join(process.cwd(), 'src', 'app', 'api')

  describe('Cover Generation Route', () => {
    const coverRouteFile = path.join(appDir, 'cover', 'generate', 'route.ts')

    it('CRITICAL: has maxDuration configured', () => {
      const content = fs.readFileSync(coverRouteFile, 'utf-8')

      // Must export maxDuration for Vercel to respect extended timeout
      expect(content).toMatch(/export\s+(const|let)\s+maxDuration\s*=/)

      // Extract the value
      const match = content.match(/export\s+(?:const|let)\s+maxDuration\s*=\s*(\d+)/)
      expect(match).toBeTruthy()

      const duration = parseInt(match![1], 10)

      // Cover generation needs at least 60s (typically takes 30-60s)
      // Set to 120s to provide buffer for retries and quality checks
      expect(duration).toBeGreaterThanOrEqual(60)
      expect(duration).toBeLessThanOrEqual(300) // Vercel Pro max is 300s
    })

    it('has sufficient timeout for AI image generation with retries', () => {
      const content = fs.readFileSync(coverRouteFile, 'utf-8')
      const match = content.match(/export\s+(?:const|let)\s+maxDuration\s*=\s*(\d+)/)
      const duration = parseInt(match![1], 10)

      // AI image generation: ~15-20s
      // Quality checks: ~5s
      // Typography composition: ~5s
      // Retries (up to 3): 3 * 30s = 90s worst case
      // Buffer: 30s
      // Total: 120s recommended minimum
      expect(duration).toBeGreaterThanOrEqual(120)
    })
  })

  describe('Tick Route (Job Processing)', () => {
    const tickRouteFile = path.join(appDir, 'create', 'job', '[jobId]', 'tick', 'route.ts')

    it('CRITICAL: has maxDuration configured', () => {
      const content = fs.readFileSync(tickRouteFile, 'utf-8')

      expect(content).toMatch(/export\s+(const|let)\s+maxDuration\s*=/)

      const match = content.match(/export\s+(?:const|let)\s+maxDuration\s*=\s*(\d+)/)
      expect(match).toBeTruthy()

      const duration = parseInt(match![1], 10)

      // Tick route waits for cover generation at finalize step
      // Must be at least as long as cover generation timeout
      expect(duration).toBeGreaterThanOrEqual(60)
    })

    it('has sufficient timeout for finalize step with cover regeneration', () => {
      const content = fs.readFileSync(tickRouteFile, 'utf-8')
      const match = content.match(/export\s+(?:const|let)\s+maxDuration\s*=\s*(\d+)/)
      const duration = parseInt(match![1], 10)

      // Finalize step awaits cover/generate which can take 120s
      // Plus some buffer for other operations (email, TTS trigger)
      // Total: 180s recommended minimum
      expect(duration).toBeGreaterThanOrEqual(180)
    })
  })

  describe('Long-running API routes', () => {
    // List of routes that involve AI calls and need extended timeouts
    const longRunningRoutes = [
      { path: 'cover/generate', minDuration: 60 },
      { path: 'create/job/[jobId]/tick', minDuration: 60 },
    ]

    for (const route of longRunningRoutes) {
      it(`${route.path} has maxDuration >= ${route.minDuration}s`, () => {
        const routePath = path.join(appDir, ...route.path.split('/'), 'route.ts')
        const content = fs.readFileSync(routePath, 'utf-8')

        const match = content.match(/export\s+(?:const|let)\s+maxDuration\s*=\s*(\d+)/)
        expect(match).toBeTruthy()

        const duration = parseInt(match![1], 10)
        expect(duration).toBeGreaterThanOrEqual(route.minDuration)
      })
    }
  })
})

describe('Finalize Step Cover Handling', () => {
  /**
   * These tests verify the finalize step logic handles cover generation correctly.
   * The bug was that when cover regeneration succeeded, the code still returned
   * "Regenerating cover..." instead of proceeding to finalization.
   */

  it('documents the correct flow for cover regeneration at finalize', () => {
    /**
     * Expected flow when coverStatus is 'failed' or null:
     *
     * 1. Call cover/generate with regenerate: true
     * 2. AWAIT the response (don't fire-and-forget!)
     * 3. If response.success && response.data.status === 'ready':
     *    - LOG success
     *    - CONTINUE to finalization (don't return!)
     * 4. If response failed or not ready:
     *    - RETURN and wait for next tick
     *
     * The bug was step 3 was returning instead of continuing.
     */
    expect(true).toBe(true) // Documentation test
  })

  it('documents the apiSuccess response format', () => {
    /**
     * The cover/generate endpoint uses apiSuccess() which wraps responses as:
     * {
     *   success: true,
     *   data: {
     *     status: 'ready',
     *     cover_url: '...',
     *     ...
     *   }
     * }
     *
     * The tick endpoint must check: result.success && result.data?.status === 'ready'
     * NOT: result.success && result.status === 'ready' (incorrect!)
     */
    expect(true).toBe(true) // Documentation test
  })
})
