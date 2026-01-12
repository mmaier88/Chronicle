import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'

// Backup status endpoint - shows last backup info
// Actual backups run on Chronicle Engine via cron, not from Vercel

const DEV_EMAILS = ['markus@maier.dev', 'markus.maier@pm.me']

export async function GET() {
  const { user } = await getUser()

  // Admin only
  if (!user || !DEV_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // This is a placeholder - in production, you'd query the Storage Box
  // or a monitoring service to get actual backup status
  const backupInfo = {
    message: 'Backup status endpoint',
    documentation: '/scripts/backup/README.md',
    configuration: {
      location: 'Chronicle Engine (Hetzner)',
      schedule: 'Daily at 3 AM UTC',
      retention: '90 days',
      destination: 'Hetzner Storage Box',
    },
    supabase_pitr: {
      status: 'Check Supabase Dashboard',
      retention: '14 days (if enabled)',
      note: 'Enable in Supabase Dashboard > Project Settings > Add-ons',
    },
    manual_commands: {
      run_backup: 'ssh chronicle@138.199.231.3 "/home/chronicle/scripts/backup/backup.sh"',
      list_backups: 'ssh chronicle@138.199.231.3 "/home/chronicle/scripts/backup/restore.sh --list"',
      check_latest: 'ssh u123456@u123456.your-storagebox.de "ls -la /chronicle-backups/database/latest.sql.gz"',
    },
  }

  return NextResponse.json(backupInfo)
}
