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
  const appDir = path.join(process.cwd(), 'src', 'app', 'api')
  const tickRouteFile = path.join(appDir, 'create', 'job', '[jobId]', 'tick', 'route.ts')

  /**
   * These tests verify the finalize step logic handles cover generation correctly.
   *
   * BUG 1 (2026-01-17): When cover regeneration succeeded, code still returned
   * "Regenerating cover..." instead of proceeding to finalization.
   *
   * BUG 2 (2026-01-17): After 5-minute timeout marked cover as 'failed' in DB,
   * the code used stale local variable 'coverStatus' (still 'generating') to
   * check if regeneration needed, skipping it entirely and finalizing without cover!
   */

  it('CRITICAL: uses needsRegeneration flag (not stale coverStatus variable)', () => {
    const content = fs.readFileSync(tickRouteFile, 'utf-8')

    // Must use a mutable flag that gets updated after timeout
    expect(content).toContain('needsRegeneration')

    // The flag must be set to true after the 5-minute timeout
    expect(content).toMatch(/needsRegeneration\s*=\s*true/)

    // The regeneration check must use the flag, not the stale coverStatus
    expect(content).toMatch(/if\s*\(\s*needsRegeneration\s*\)/)
  })

  it('CRITICAL: checks apiSuccess response correctly (result.data?.status)', () => {
    const content = fs.readFileSync(tickRouteFile, 'utf-8')

    // Must check result.data?.status, NOT result.status
    expect(content).toContain('coverResult.data?.status')

    // Should NOT have the incorrect pattern
    expect(content).not.toMatch(/coverResult\.status\s*===\s*['"]ready['"]/)
  })

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

  it('documents the stale variable bug and fix', () => {
    /**
     * THE BUG (stale variable):
     *
     * 1. coverStatus = 'generating' (from DB)
     * 2. After 5 min timeout, update DB to 'failed'
     * 3. Check: if (coverStatus === 'failed') → FALSE! (still 'generating')
     * 4. Skip regeneration, finalize without cover!
     *
     * THE FIX (needsRegeneration flag):
     *
     * 1. let needsRegeneration = (coverStatus === 'failed' || !coverStatus)
     * 2. After 5 min timeout, set needsRegeneration = true
     * 3. Check: if (needsRegeneration) → TRUE!
     * 4. Regenerate cover, then finalize
     */
    expect(true).toBe(true) // Documentation test
  })
})
