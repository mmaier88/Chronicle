import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Health check endpoint for uptime monitoring
 *
 * Checks:
 * - API is responding
 * - Database connection works
 *
 * Used by UptimeRobot, Better Uptime, etc.
 */
export async function GET() {
  const checks = {
    api: true,
    database: false,
  }

  try {
    // Test database connection
    const supabase = createServiceClient()
    const { error } = await supabase.from('books').select('id').limit(1)

    checks.database = !error

    const allHealthy = Object.values(checks).every(Boolean)

    return NextResponse.json(
      {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
      },
      { status: allHealthy ? 200 : 503 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
