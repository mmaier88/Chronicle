import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Cron job to cleanup old rate limit records.
 * Runs daily at 4 AM UTC.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // Cleanup rate limits
    const { data: rateLimitCleanup, error: rateLimitError } = await supabase.rpc(
      'cleanup_rate_limits'
    )

    if (rateLimitError) {
      console.error('[security/cleanup] Rate limit cleanup error:', rateLimitError)
    }

    // Cleanup old audit logs (keep 90 days)
    const { error: auditError } = await supabase
      .from('security_audit_log')
      .delete()
      .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    if (auditError) {
      console.error('[security/cleanup] Audit log cleanup error:', auditError)
    }

    return NextResponse.json({
      success: true,
      rateLimitsDeleted: rateLimitCleanup ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[security/cleanup] Error:', err)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
