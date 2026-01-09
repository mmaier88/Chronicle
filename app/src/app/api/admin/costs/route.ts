import { createServiceClient, getUser } from '@/lib/supabase/server'
import { apiSuccess, ApiErrors } from '@/lib/api-utils'
import { calculateTotalCost, formatCost, calculateCost } from '@/lib/ai-pricing'

// Dev user IDs who can access admin endpoints
const ADMIN_USERS: string[] = [
  // Add admin user IDs here
]

/**
 * GET /api/admin/costs
 *
 * Query params:
 * - userId: specific user ID (optional, defaults to current user)
 * - days: number of days to look back (default: 30)
 * - breakdown: include per-model breakdown (default: false)
 */
export async function GET(request: Request) {
  const { user, isDevUser } = await getUser()

  if (!user) {
    return ApiErrors.unauthorized()
  }

  // Only dev users or admins can query other users
  const url = new URL(request.url)
  const queryUserId = url.searchParams.get('userId')
  const days = parseInt(url.searchParams.get('days') || '30', 10)
  const breakdown = url.searchParams.get('breakdown') === 'true'

  // Determine which user to query
  const targetUserId = queryUserId && (isDevUser || ADMIN_USERS.includes(user.id))
    ? queryUserId
    : user.id

  const supabase = createServiceClient()

  // Calculate date range
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Query AI jobs
  const { data: jobs, error } = await supabase
    .from('ai_jobs')
    .select('model_name, input_tokens, output_tokens, created_at, status')
    .eq('user_id', targetUserId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    return ApiErrors.internal('Failed to fetch usage data')
  }

  // Calculate totals
  const completedJobs = jobs?.filter(j => j.status === 'completed') || []
  const totalCost = calculateTotalCost(completedJobs)
  const totalInputTokens = completedJobs.reduce((sum, j) => sum + (j.input_tokens || 0), 0)
  const totalOutputTokens = completedJobs.reduce((sum, j) => sum + (j.output_tokens || 0), 0)

  const result: Record<string, unknown> = {
    userId: targetUserId,
    period: {
      days,
      start: startDate.toISOString(),
      end: new Date().toISOString(),
    },
    totals: {
      cost: totalCost,
      costFormatted: formatCost(totalCost),
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      jobCount: completedJobs.length,
      failedJobCount: (jobs?.length || 0) - completedJobs.length,
    },
  }

  // Optional per-model breakdown
  if (breakdown) {
    const modelBreakdown: Record<string, {
      cost: number
      costFormatted: string
      inputTokens: number
      outputTokens: number
      jobCount: number
    }> = {}

    for (const job of completedJobs) {
      if (!job.input_tokens || !job.output_tokens) continue

      if (!modelBreakdown[job.model_name]) {
        modelBreakdown[job.model_name] = {
          cost: 0,
          costFormatted: '',
          inputTokens: 0,
          outputTokens: 0,
          jobCount: 0,
        }
      }

      const cost = calculateCost(job.model_name, job.input_tokens, job.output_tokens)
      modelBreakdown[job.model_name].cost += cost
      modelBreakdown[job.model_name].inputTokens += job.input_tokens
      modelBreakdown[job.model_name].outputTokens += job.output_tokens
      modelBreakdown[job.model_name].jobCount += 1
    }

    // Format costs
    for (const model of Object.keys(modelBreakdown)) {
      modelBreakdown[model].costFormatted = formatCost(modelBreakdown[model].cost)
    }

    result.breakdown = modelBreakdown
  }

  return apiSuccess(result)
}
