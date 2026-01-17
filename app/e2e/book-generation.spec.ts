import { test, expect } from '@playwright/test'

/**
 * Book Generation Integration Tests
 *
 * These tests verify the book generation pipeline works end-to-end.
 * They use API calls directly since OAuth login cannot be automated.
 *
 * Required environment variables:
 * - PLAYWRIGHT_BASE_URL: Base URL (e.g., https://staging.chronicle.town)
 * - E2E_TEST_USER_ID: Test user UUID
 * - CRON_SECRET: Secret for authenticated API calls
 */

const TEST_USER_ID = process.env.E2E_TEST_USER_ID
const CRON_SECRET = process.env.CRON_SECRET

test.describe('Book Generation API', () => {
  test.skip(!TEST_USER_ID || !CRON_SECRET, 'Requires E2E_TEST_USER_ID and CRON_SECRET')

  test('health check endpoints respond', async ({ request }) => {
    // Check that key endpoints are accessible
    // Tick endpoint should require auth, returning 401 not 500
    const tickResponse = await request.get('/api/create/job/test-nonexistent-id/tick')
    expect(tickResponse.status()).toBe(401)
  })

  test('job status endpoint works', async ({ request }) => {
    // Try to get status of a non-existent job - should return 404, not 500
    const response = await request.get('/api/create/job/00000000-0000-0000-0000-000000000000', {
      headers: {
        'x-cron-secret': CRON_SECRET!,
        'x-user-id': TEST_USER_ID!,
      },
    })

    // Should be 404 (not found) or 401 (unauthorized), not 500
    expect([401, 404]).toContain(response.status())
  })

  test('kick endpoint works on staging', async ({ request, baseURL }) => {
    // Skip if not staging
    test.skip(!baseURL?.includes('staging'), 'Kick endpoint only works on staging')

    const response = await request.get('/api/create/job/00000000-0000-0000-0000-000000000000/kick')

    // Should return 404 for non-existent job
    expect(response.status()).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Job not found')
  })
})

test.describe('Preview Generation API', () => {
  test.skip(!CRON_SECRET, 'Requires CRON_SECRET')

  test('preview endpoint validates input', async ({ request }) => {
    const response = await request.post('/api/create/preview', {
      data: {
        // Missing required fields
        genre: 'fiction',
      },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Should return 400 (bad request) or 401 (unauthorized), not 500
    expect([400, 401]).toContain(response.status())
  })
})

test.describe('Auto-Resume Cron', () => {
  test.skip(!CRON_SECRET, 'Requires CRON_SECRET')

  test('auto-resume endpoint responds', async ({ request }) => {
    const response = await request.post('/api/create/job/auto-resume', {
      headers: {
        'x-cron-secret': CRON_SECRET!,
      },
    })

    // Should succeed (possibly with "no jobs to resume" message)
    expect(response.ok()).toBe(true)

    const body = await response.json()
    expect(body).toHaveProperty('message')
  })
})

test.describe('Synthetic Monitoring', () => {
  test.skip(!CRON_SECRET, 'Requires CRON_SECRET')

  test('synthetic check endpoint responds', async ({ request }) => {
    const response = await request.get('/api/monitoring/synthetic', {
      headers: {
        'x-cron-secret': CRON_SECRET!,
      },
    })

    // Should return health status
    if (response.ok()) {
      const body = await response.json()
      expect(body).toHaveProperty('status')
      expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status)
    }
  })
})

test.describe('Full Book Generation Flow', () => {
  test.skip(!TEST_USER_ID || !CRON_SECRET, 'Requires E2E_TEST_USER_ID and CRON_SECRET')

  // This is a long-running test that creates a real book
  test.slow()

  test('can create and generate a book via API', async ({ request }) => {
    // Step 1: Generate preview
    const previewResponse = await request.post('/api/create/preview', {
      data: {
        genre: 'fiction',
        prompt: 'E2E TEST: A short story about a robot learning to paint',
        targetPages: 30,
      },
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET!,
        'x-user-id': TEST_USER_ID!,
      },
    })

    // If preview generation fails due to auth, skip the rest
    if (previewResponse.status() === 401) {
      test.skip(true, 'Preview endpoint requires authenticated session')
      return
    }

    expect(previewResponse.ok()).toBe(true)
    const preview = await previewResponse.json()
    expect(preview).toHaveProperty('title')
    expect(preview).toHaveProperty('logline')

    // Step 2: Create job
    const jobResponse = await request.post('/api/create/job', {
      data: {
        genre: 'fiction',
        prompt: 'E2E TEST: A short story about a robot learning to paint',
        preview: preview,
        length: 30,
        mode: 'draft',
      },
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET!,
        'x-user-id': TEST_USER_ID!,
      },
    })

    if (jobResponse.status() === 401) {
      test.skip(true, 'Job endpoint requires authenticated session')
      return
    }

    expect(jobResponse.ok()).toBe(true)
    const job = await jobResponse.json()
    expect(job).toHaveProperty('job_id')
    expect(job).toHaveProperty('book_id')

    const jobId = job.job_id

    // Step 3: Poll tick endpoint until completion (max 10 minutes)
    const maxPolls = 60 // 60 * 10 seconds = 10 minutes
    let completed = false
    let lastProgress = 0

    for (let i = 0; i < maxPolls && !completed; i++) {
      const tickResponse = await request.post(`/api/create/job/${jobId}/tick`, {
        headers: {
          'x-cron-secret': CRON_SECRET!,
          'x-user-id': TEST_USER_ID!,
        },
      })

      expect(tickResponse.ok()).toBe(true)
      const tickResult = await tickResponse.json()

      if (tickResult.status === 'complete') {
        completed = true
        console.log(`Book generation completed at step: ${tickResult.step}`)
      } else if (tickResult.status === 'failed') {
        throw new Error(`Book generation failed: ${tickResult.error}`)
      } else {
        const progress = tickResult.progress || 0
        if (progress > lastProgress) {
          console.log(`Progress: ${progress}% (step: ${tickResult.step})`)
          lastProgress = progress
        }
        // Wait 10 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 10000))
      }
    }

    expect(completed).toBe(true)
  })
})
