# Uptime Monitoring Setup

Chronicle uses external uptime monitoring to ensure the production site is always available.

## Recommended Services

- **UptimeRobot** (Free tier: 50 monitors, 5-minute intervals)
- **Better Uptime** (Free tier: 10 monitors)
- **Pingdom** (Paid)

## Endpoints to Monitor

### Critical Endpoints (5-minute intervals)

| Endpoint | Method | Expected Status | Description |
|----------|--------|-----------------|-------------|
| `https://chronicle.town/` | GET | 200 | Landing page |
| `https://chronicle.town/api/health` | GET | 200 | API health check |
| `https://chronicle.town/api/create/preview` | POST | 401 | Auth required (proves API is up) |

### Secondary Endpoints (15-minute intervals)

| Endpoint | Method | Expected Status | Description |
|----------|--------|-----------------|-------------|
| `https://chronicle.town/login` | GET | 200 | Auth pages |
| `https://chronicle.town/legal` | GET | 200 | Legal pages |

## UptimeRobot Setup

1. Create account at https://uptimerobot.com
2. Add monitors:
   - **Chronicle Landing**: HTTP(s), URL: `https://chronicle.town/`, Interval: 5 min
   - **Chronicle API**: HTTP(s), URL: `https://chronicle.town/api/create/preview`, Method: POST, Interval: 5 min
3. Set up alerts:
   - Email alerts to team
   - Slack/Discord webhook (optional)

## Health Check Endpoint

Create `/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
```

## Alert Configuration

Recommended alert settings:
- **Downtime threshold**: 2 consecutive failures
- **Alert on recovery**: Yes
- **Alert channels**: Email + Slack

## Staging Monitoring

Also monitor staging for early detection:
- `https://staging.chronicle.town/`

## Incident Response

1. Check Vercel deployment status
2. Check Supabase dashboard for database issues
3. Check Sentry for errors
4. Check ElevenLabs status (for TTS issues)
5. Check Stripe status (for payment issues)
