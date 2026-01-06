import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { Orchestrator, BookJobInput } from './orchestrator.js';

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

/**
 * Job data structure
 */
interface GenerateBookJobData {
  jobId: string;
  input: BookJobInput;
}

/**
 * Update job progress in database
 */
async function updateJobProgress(jobId: string, progress: number, message: string): Promise<void> {
  await prisma.bookJob.update({
    where: { id: jobId },
    data: {
      progress,
      message,
      status: progress >= 100 ? 'succeeded' : 'running'
    }
  });
}

/**
 * Process a book generation job
 */
async function processBookJob(job: Job<GenerateBookJobData>): Promise<void> {
  const { jobId, input } = job.data;

  console.log(`[${jobId}] Starting book generation`, {
    genre: input.genre,
    targetWords: input.target_length_words
  });

  try {
    // Mark job as running
    await prisma.bookJob.update({
      where: { id: jobId },
      data: { status: 'running', message: 'Starting generation...' }
    });

    // Create orchestrator
    const orchestrator = new Orchestrator(
      prisma,
      jobId,
      (progress, message) => updateJobProgress(jobId, progress, message)
    );

    // Run generation
    const manuscript = await orchestrator.run(input);

    console.log(`[${jobId}] Book generation complete`, {
      wordCount: manuscript.split(/\s+/).length
    });

    // Mark job as succeeded
    await prisma.bookJob.update({
      where: { id: jobId },
      data: {
        status: 'succeeded',
        progress: 100,
        message: 'Complete!'
      }
    });

  } catch (error) {
    console.error(`[${jobId}] Book generation failed`, error);

    // Mark job as failed
    await prisma.bookJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      }
    });

    throw error;
  }
}

/**
 * Create and start the worker
 */
async function main() {
  console.log('Chronicle Worker starting...');

  // Verify connections
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL');

    await redis.ping();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Failed to connect to services:', error);
    process.exit(1);
  }

  // Create worker
  const worker = new Worker<GenerateBookJobData>(
    'chronicle-books',
    processBookJob,
    {
      connection: redis,
      concurrency: 1, // One book at a time to manage resources
      lockDuration: 300000, // 5 minutes - books take a long time
      stalledInterval: 60000 // Check for stalled jobs every minute
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`[${job.data.jobId}] Job completed successfully`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[${job?.data.jobId}] Job failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });

  console.log('Chronicle Worker ready, waiting for jobs...');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down worker...');
    await worker.close();
    await redis.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error('Worker startup failed:', error);
  process.exit(1);
});
