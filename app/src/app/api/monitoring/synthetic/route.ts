import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/monitoring/synthetic
 *
 * Synthetic monitoring endpoint that checks system health.
 * Can be called by external monitoring services (e.g., Datadog, Pingdom)
 * or by our own GitHub Actions workflow.
 *
 * Checks:
 * 1. Database connectivity
 * 2. Recent job success/failure rates
 * 3. Stuck job detection
 * 4. Cover generation health
 *
 * Returns:
 * - status: 'healthy' | 'degraded' | 'unhealthy'
 * - checks: detailed check results
 * - timestamp: ISO timestamp
 */

interface CheckResult {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  details?: Record<string, unknown>
}

function cleanEnvValue(value: string | undefined): string | undefined {
  if (!value) return value
  return value
    .replace(/^["']|["']$/g, '')
    .replace(/\\n$/g, '')
    .trim()
}

export async function GET(request: NextRequest) {
  // Verify cron secret for authenticated access
  const cronSecret = cleanEnvValue(
    request.headers.get('x-cron-secret') ||
      request.headers.get('authorization')?.replace('Bearer ', '')
  )
  const expectedSecret = cleanEnvValue(process.env.CRON_SECRET)

  if (!cronSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const checks: CheckResult[] = []
  const supabase = createServiceClient()

  // Check 1: Database connectivity
  try {
    const { count, error } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })

    if (error) {
      checks.push({
        name: 'database',
        status: 'fail',
        message: `Database error: ${error.message}`,
      })
    } else {
      checks.push({
        name: 'database',
        status: 'pass',
        message: 'Database connected',
        details: { total_books: count },
      })
    }
  } catch (error) {
    checks.push({
      name: 'database',
      status: 'fail',
      message: `Database exception: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  }

  // Check 2: Recent job success rate (last 24 hours)
  try {
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const { data: recentJobs, error } = await supabase
      .from('vibe_jobs')
      .select('status')
      .gte('created_at', yesterday.toISOString())

    if (error) {
      checks.push({
        name: 'job_success_rate',
        status: 'fail',
        message: `Failed to fetch jobs: ${error.message}`,
      })
    } else {
      const total = recentJobs?.length || 0
      const completed = recentJobs?.filter((j) => j.status === 'complete').length || 0
      const failed = recentJobs?.filter((j) => j.status === 'failed').length || 0
      const inProgress = recentJobs?.filter((j) => ['running', 'queued'].includes(j.status)).length || 0

      const successRate = total > 0 ? (completed / total) * 100 : 100

      let status: 'pass' | 'warn' | 'fail' = 'pass'
      if (successRate < 50) status = 'fail'
      else if (successRate < 80) status = 'warn'

      checks.push({
        name: 'job_success_rate',
        status,
        message: `${successRate.toFixed(1)}% success rate (${completed}/${total})`,
        details: {
          total,
          completed,
          failed,
          in_progress: inProgress,
          success_rate: successRate,
        },
      })
    }
  } catch (error) {
    checks.push({
      name: 'job_success_rate',
      status: 'fail',
      message: `Exception: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  }

  // Check 3: Stuck jobs detection
  try {
    const staleTime = new Date()
    staleTime.setMinutes(staleTime.getMinutes() - 30) // 30 minutes

    const { data: stuckJobs, error } = await supabase
      .from('vibe_jobs')
      .select('id, step, progress, updated_at')
      .in('status', ['running', 'queued'])
      .lt('updated_at', staleTime.toISOString())

    if (error) {
      checks.push({
        name: 'stuck_jobs',
        status: 'fail',
        message: `Failed to check stuck jobs: ${error.message}`,
      })
    } else {
      const stuckCount = stuckJobs?.length || 0

      let status: 'pass' | 'warn' | 'fail' = 'pass'
      if (stuckCount > 5) status = 'fail'
      else if (stuckCount > 0) status = 'warn'

      checks.push({
        name: 'stuck_jobs',
        status,
        message: stuckCount === 0 ? 'No stuck jobs' : `${stuckCount} job(s) stuck for >30 minutes`,
        details: {
          stuck_count: stuckCount,
          stuck_jobs: stuckJobs?.map((j) => ({
            id: j.id,
            step: j.step,
            progress: j.progress,
            stale_minutes: Math.round((Date.now() - new Date(j.updated_at).getTime()) / 60000),
          })),
        },
      })
    }
  } catch (error) {
    checks.push({
      name: 'stuck_jobs',
      status: 'fail',
      message: `Exception: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  }

  // Check 4: Cover generation health (last 24 hours)
  try {
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const { data: recentBooks, error } = await supabase
      .from('books')
      .select('cover_status')
      .eq('status', 'final')
      .gte('created_at', yesterday.toISOString())

    if (error) {
      checks.push({
        name: 'cover_generation',
        status: 'fail',
        message: `Failed to check covers: ${error.message}`,
      })
    } else {
      const total = recentBooks?.length || 0
      const ready = recentBooks?.filter((b) => b.cover_status === 'ready').length || 0
      const failed = recentBooks?.filter((b) => b.cover_status === 'failed').length || 0
      const generating = recentBooks?.filter((b) => b.cover_status === 'generating').length || 0

      const coverSuccessRate = total > 0 ? (ready / total) * 100 : 100

      let status: 'pass' | 'warn' | 'fail' = 'pass'
      if (coverSuccessRate < 50) status = 'fail'
      else if (coverSuccessRate < 80 || generating > 2) status = 'warn'

      checks.push({
        name: 'cover_generation',
        status,
        message:
          total === 0
            ? 'No recent books to check'
            : `${coverSuccessRate.toFixed(1)}% cover success rate`,
        details: {
          total,
          ready,
          failed,
          generating,
          success_rate: coverSuccessRate,
        },
      })
    }
  } catch (error) {
    checks.push({
      name: 'cover_generation',
      status: 'fail',
      message: `Exception: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  }

  // Calculate overall status
  const hasFailure = checks.some((c) => c.status === 'fail')
  const hasWarning = checks.some((c) => c.status === 'warn')
  const overallStatus = hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy'

  const duration = Date.now() - startTime

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    duration_ms: duration,
    checks,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  }

  // Return appropriate status code
  const statusCode = overallStatus === 'unhealthy' ? 503 : 200

  return NextResponse.json(response, { status: statusCode })
}
