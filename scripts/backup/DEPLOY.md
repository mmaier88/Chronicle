# Deploy Backup System

Scripts are already deployed to Chronicle Engine at `/root/scripts/backup/`.

## Step 1: Add SSH key to Storage Box (ONE TIME ONLY)

Add this public key to Hetzner Storage Box:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEBcsEEs2xwKBMDgp60pORmqJ/boFv0RtO7M6k+w67lX root@ResearchBase
```

1. Go to https://robot.hetzner.com/storage
2. Select "storage-box1" (#500337)
3. Click "SSH Keys" tab
4. Add the public key above

## Step 2: Configure database URL

SSH into Chronicle Engine and update the env files with your Supabase database URL:

```bash
ssh root@138.199.231.3
```

Edit production config:
```bash
nano /root/.backup-prod.env
```

Edit staging config:
```bash
nano /root/.backup-staging.env
```

In each file, replace `YOUR_PASSWORD` in the `SUPABASE_DB_URL` with your actual database password from:
- Supabase Dashboard > Settings > Database > Connection string (Transaction mode)

## Step 3: Test backup

```bash
# Test production backup
source /root/.backup-prod.env
/root/scripts/backup/backup.sh

# Test staging backup
source /root/.backup-staging.env
/root/scripts/backup/backup.sh
```

## Step 4: Verify backup on Storage Box

```bash
sftp -i /root/.ssh/storagebox_key u517522@u517522.your-storagebox.de
sftp> ls chronicle/production/database/
sftp> ls chronicle/staging/database/
sftp> exit
```

## Step 5: Setup cron jobs (automated daily backups)

```bash
crontab -e
```

Add these lines for daily backups at 3 AM and 4 AM UTC:
```
# Chronicle Production backup at 3 AM UTC
0 3 * * * source /root/.backup-prod.env && /root/scripts/backup/backup.sh >> /var/log/chronicle-backup-prod.log 2>&1

# Chronicle Staging backup at 4 AM UTC
0 4 * * * source /root/.backup-staging.env && /root/scripts/backup/backup.sh >> /var/log/chronicle-backup-staging.log 2>&1
```

## Environment files location

- Production: `/root/.backup-prod.env`
- Staging: `/root/.backup-staging.env`
- SSH Key: `/root/.ssh/storagebox_key`
- Scripts: `/root/scripts/backup/`

## Monitor backups

```bash
# View production backup log
tail -50 /var/log/chronicle-backup-prod.log

# View staging backup log
tail -50 /var/log/chronicle-backup-staging.log
```
