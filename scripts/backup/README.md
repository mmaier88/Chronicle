# Chronicle Backup Strategy

## Overview

Chronicle uses a **two-layer backup strategy**:

| Layer | What | Where | Retention | Managed By |
|-------|------|-------|-----------|------------|
| **1. Operational** | Database | Supabase | 7 days | Automatic (Pro plan) |
| **2. Archive** | Database + Covers | Hetzner Storage Box | 90 days | Our scripts |
| **Bonus** | Chronicle Engine | Hetzner Server Backups | 7 days | Automatic |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 1: OPERATIONAL                        │
│                                                                 │
│  Supabase Pro Daily Backups (7 days) - AUTOMATIC               │
│  - Handles: accidental deletions, bugs, rollbacks              │
│  - Restore: Supabase Dashboard > Database > Backups            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 2: ARCHIVE                            │
│                                                                 │
│  Daily pg_dump → Hetzner Storage Box (90 days)                 │
│  - Handles: Supabase outage, account issues, disaster          │
│  - Includes: Database + Cover images                           │
│  - Runs: 3:30/3:45 AM UTC daily from Chronicle Engine          │
└─────────────────────────────────────────────────────────────────┘

Storage Box: u517522.your-storagebox.de (BX11, #500337)
Chronicle Engine: 138.199.231.3 (Hetzner cx42)
```

## Backup Schedule

| Project | Time (UTC) | Environment | Log File |
|---------|------------|-------------|----------|
| Chronicle Production | 3:30 AM | xxudepdsvrwsjyqtqzgm | /var/log/chronicle-prod-backup.log |
| Chronicle Staging | 3:45 AM | lckwlokaarkevrjraxax | /var/log/chronicle-staging-backup.log |

## Daily Operations

### Check last backup
```bash
ssh root@138.199.231.3 "sftp -P 23 -i /root/.ssh/storagebox_key u517522@u517522.your-storagebox.de << 'EOF'
ls -la /home/chronicle-backups/production/database
ls -la /home/chronicle-backups/staging/database
EOF"
```

### View backup log
```bash
ssh root@138.199.231.3 "tail -50 /var/log/chronicle-prod-backup.log"
ssh root@138.199.231.3 "tail -50 /var/log/chronicle-staging-backup.log"
```

### Manual backup
```bash
ssh root@138.199.231.3 "source /root/.backup-chronicle-prod.env && /root/scripts/backup/backup.sh"
ssh root@138.199.231.3 "source /root/.backup-chronicle-staging.env && /root/scripts/backup/backup.sh"
```

## Restore

### From Supabase (last 7 days)
1. Go to Supabase Dashboard
2. Project Settings > Database > Backups
3. Select backup and restore

### From Storage Box (last 90 days)
```bash
# List available backups
sftp -P 23 -i ~/.ssh/id_ed25519 u517522@u517522.your-storagebox.de
sftp> ls -la /home/chronicle-backups/production/database

# Download a backup
sftp> get /home/chronicle-backups/production/database/chronicle_2026-01-11_03-30-00.sql.gz

# Restore to database
gunzip chronicle_2026-01-11_03-30-00.sql.gz
psql -h db.xxudepdsvrwsjyqtqzgm.supabase.co -U postgres -d postgres < chronicle_2026-01-11_03-30-00.sql
```

## Configuration Files (on Chronicle Engine)

| File | Purpose |
|------|---------|
| `/root/.backup-chronicle-prod.env` | Production backup credentials |
| `/root/.backup-chronicle-staging.env` | Staging backup credentials |
| `/root/scripts/backup/backup.sh` | Main backup script |
| `/root/.ssh/storagebox_key` | SSH key for Storage Box |

## What's NOT backed up

| Item | Reason |
|------|--------|
| Supabase Auth users | Managed by Supabase, included in their backups |
| Edge function code | In git repository |
| Environment variables | Store separately in 1Password/secrets manager |

## Costs

| Service | Cost |
|---------|------|
| Supabase Pro backups | Included in Pro plan |
| Hetzner Storage Box BX11 | ~€3.50/month (shared) |
| Hetzner Server backups | ~€1.20/month (20% of server) |
| **Total backup cost** | **~€4.70/month** |

## Credentials

All database credentials are stored in 1Password:
- **RB - Prod**: Chronicle Production - Database
- **RB - Staging**: Chronicle Staging - Database
