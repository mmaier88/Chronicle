import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

const router = Router();

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Queue with connection config (BullMQ creates its own Redis connection)
const bookQueue = new Queue('chronicle-books', {
  connection: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
});

/**
 * Generation modes:
 * - draft: Fast generation, no editor (2x faster, good for prototyping)
 * - polished: Full pipeline with editor loop (higher quality, redundancy detection)
 */
const GenerationMode = z.enum(['draft', 'polished']).default('draft');

/**
 * Request body schema for creating a book
 */
const CreateBookSchema = z.object({
  prompt: z.string().min(10).max(2000),
  genre: z.string().min(2).max(100).optional().default('literary fiction'),
  target_length_words: z.number().min(10000).max(100000).optional().default(25000),
  voice: z.string().max(500).optional(),
  mode: GenerationMode.optional().default('draft')
});

/**
 * POST /v1/books - Create a new book generation job
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const input = CreateBookSchema.parse(req.body);

    // Create job in database
    const job = await prisma.bookJob.create({
      data: {
        status: 'queued',
        progress: 0,
        message: 'Queued for generation',
        input: input as any
      }
    });

    // Add to queue
    await bookQueue.add(
      'generate-book',
      {
        jobId: job.id,
        input: {
          prompt: input.prompt,
          genre: input.genre,
          target_length_words: input.target_length_words,
          voice: input.voice,
          mode: input.mode
        }
      },
      {
        jobId: job.id,
        attempts: 1, // No retries - jobs checkpoint and can be resumed
        removeOnComplete: false,
        removeOnFail: false
      }
    );

    res.status(201).json({
      job_id: job.id,
      status: 'queued',
      mode: input.mode,
      message: `Book generation job created (${input.mode} mode)`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid request',
        details: error.errors
      });
      return;
    }

    console.error('Failed to create book job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /v1/books/:id - Get job status
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await prisma.bookJob.findUnique({
      where: { id: req.params.id }
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json({
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
      error: job.error
    });

  } catch (error) {
    console.error('Failed to get job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /v1/books/:id/manuscript - Get the final manuscript
 */
router.get('/:id/manuscript', async (req: Request, res: Response) => {
  try {
    const job = await prisma.bookJob.findUnique({
      where: { id: req.params.id },
      include: { manuscript: true }
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.status !== 'succeeded') {
      res.status(409).json({
        error: 'Manuscript not ready',
        status: job.status,
        progress: job.progress,
        message: job.message
      });
      return;
    }

    if (!job.manuscript) {
      res.status(404).json({ error: 'Manuscript not found' });
      return;
    }

    res.json({
      title: job.manuscript.title,
      blurb: job.manuscript.blurb,
      content: job.manuscript.content,
      stats: job.manuscript.stats,
      created_at: job.manuscript.createdAt
    });

  } catch (error) {
    console.error('Failed to get manuscript:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /v1/books/:id/checkpoints - Get generation checkpoints (for debugging)
 */
router.get('/:id/checkpoints', async (req: Request, res: Response) => {
  try {
    const checkpoints = await prisma.narrativeCheckpoint.findMany({
      where: { jobId: req.params.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        phase: true,
        createdAt: true,
        notes: true
      }
    });

    res.json({ checkpoints });

  } catch (error) {
    console.error('Failed to get checkpoints:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
