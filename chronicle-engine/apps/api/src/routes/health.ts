import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// Initialize clients
const prisma = new PrismaClient();

// Simple Redis check using raw connection
async function checkRedis(): Promise<{ ok: boolean; latency?: number; error?: string }> {
  const start = Date.now();
  try {
    const net = await import('net');
    return new Promise((resolve) => {
      const socket = net.createConnection({
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      });
      socket.on('connect', () => {
        socket.destroy();
        resolve({ ok: true, latency: Date.now() - start });
      });
      socket.on('error', (err) => {
        socket.destroy();
        resolve({ ok: false, error: err.message });
      });
      socket.setTimeout(5000, () => {
        socket.destroy();
        resolve({ ok: false, error: 'Timeout' });
      });
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

/**
 * GET /health - Health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // Check PostgreSQL
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = { status: 'healthy', latency_ms: Date.now() - dbStart };
  } catch (error) {
    checks.postgres = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Check Redis
  const redisCheck = await checkRedis();
  if (redisCheck.ok) {
    checks.redis = { status: 'healthy', latency_ms: redisCheck.latency };
  } else {
    checks.redis = { status: 'unhealthy', error: redisCheck.error };
  }

  // Overall status
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks
  });
});

/**
 * GET /health/ready - Readiness check
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisCheck = await checkRedis();
    if (!redisCheck.ok) throw new Error(redisCheck.error);
    res.status(200).json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

/**
 * GET /health/live - Liveness check
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ live: true });
});

export default router;
