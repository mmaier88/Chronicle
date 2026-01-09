/**
 * Cover Generation Pipeline
 *
 * Orchestrates the complete cover generation process:
 * 1. Concept Distillation (text only)
 * 2. Image Asset Generation (constrained)
 * 3. Quality Gates
 * 4. Typography & Layout
 *
 * Core principle: AI generates images, Chronicle designs covers.
 */

import { distillConcept, Concept, ConceptInput } from './concept'
import { buildImagePrompt, Track } from './prompt'
import { generateImageWithRetry } from './generate'
import { runQualityChecks, QualityCheckResult } from './quality'
import { composeCover, resizeForCover } from './typography'
import { logger } from '@/lib/logger'

export interface CoverPipelineInput {
  // Story metadata for concept distillation
  summary: string
  genre: string
  mood?: string
  timePeriod?: string

  // Cover composition
  title: string
  author?: string

  // Options
  track?: Track
  maxAttempts?: number
  skipQualityGates?: boolean // For testing
}

export interface CoverPipelineResult {
  success: boolean
  coverBuffer?: Buffer
  imageAssetBuffer?: Buffer // The raw image without typography
  concept?: Concept
  qualityChecks?: QualityCheckResult
  attempts: number
  error?: string
}

/**
 * Generate a complete book cover
 *
 * Pipeline:
 * 1. Distill story into visual concept
 * 2. Generate constrained image asset
 * 3. Run quality gates (reject if failed)
 * 4. Compose final cover with typography
 */
export async function generateCover(input: CoverPipelineInput): Promise<CoverPipelineResult> {
  const {
    summary,
    genre,
    mood,
    timePeriod,
    title,
    author,
    track = 'EDITORIAL_MINIMAL',
    maxAttempts = 3,
    skipQualityGates = false,
  } = input

  let attempts = 0
  let lastError: string | undefined

  try {
    // Step 1: Concept Distillation
    logger.info('Cover pipeline: distilling concept', { genre, titleLength: title.length })

    const conceptInput: ConceptInput = {
      summary,
      genre,
      mood,
      timePeriod,
    }

    const concept = await distillConcept(conceptInput)
    logger.info('Cover pipeline: concept distilled', {
      theme: concept.core_theme,
      metaphor: concept.visual_metaphor,
    })

    // Step 2 & 3: Generate image with quality gates
    let imageBuffer: Buffer | null = null
    let qualityResult: QualityCheckResult | undefined

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      attempts = attempt + 1
      logger.info('Cover pipeline: generating image', { attempt: attempts })

      try {
        // Generate image
        const promptBuilder = (attemptNum: number) =>
          buildImagePrompt({ concept, track, attempt: attemptNum })

        imageBuffer = await generateImageWithRetry(promptBuilder, 2)

        // Run quality gates (unless skipped)
        if (!skipQualityGates) {
          qualityResult = await runQualityChecks(imageBuffer)

          if (!qualityResult.passed) {
            logger.warn('Cover pipeline: quality gate failed', {
              attempt: attempts,
              reason: qualityResult.reason,
            })
            lastError = qualityResult.reason
            imageBuffer = null
            continue
          }
        }

        // Quality passed!
        logger.info('Cover pipeline: image passed quality gates', { attempt: attempts })
        break
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        logger.error('Cover pipeline: image generation failed', error, { attempt: attempts })
        imageBuffer = null
      }
    }

    if (!imageBuffer) {
      return {
        success: false,
        attempts,
        error: lastError || 'Failed to generate image after all attempts',
        concept,
      }
    }

    // Step 4: Compose final cover with typography
    logger.info('Cover pipeline: composing final cover')

    const coverBuffer = await composeCover({
      imageBuffer,
      title,
      author,
      genre,
    })

    logger.info('Cover pipeline: complete', { attempts })

    return {
      success: true,
      coverBuffer,
      imageAssetBuffer: await resizeForCover(imageBuffer),
      concept,
      qualityChecks: qualityResult,
      attempts,
    }
  } catch (error) {
    logger.error('Cover pipeline: fatal error', error)
    return {
      success: false,
      attempts,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate only the image asset (no typography)
 * Useful for regeneration where you want to keep the concept
 */
export async function generateImageAsset(
  concept: Concept,
  track: Track = 'EDITORIAL_MINIMAL',
  maxAttempts: number = 3
): Promise<{ success: boolean; imageBuffer?: Buffer; attempts: number; error?: string }> {
  let attempts = 0
  let lastError: string | undefined

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    attempts = attempt + 1

    try {
      const promptBuilder = (attemptNum: number) =>
        buildImagePrompt({ concept, track, attempt: attemptNum })

      const imageBuffer = await generateImageWithRetry(promptBuilder, 2)
      const qualityResult = await runQualityChecks(imageBuffer)

      if (!qualityResult.passed) {
        lastError = qualityResult.reason
        continue
      }

      return {
        success: true,
        imageBuffer: await resizeForCover(imageBuffer),
        attempts,
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  return {
    success: false,
    attempts,
    error: lastError || 'Failed to generate image',
  }
}

/**
 * Regenerate cover with a new image but same concept
 */
export async function regenerateCover(
  existingConcept: Concept,
  title: string,
  author: string | undefined,
  genre: string,
  track: Track = 'EDITORIAL_MINIMAL'
): Promise<CoverPipelineResult> {
  const result = await generateImageAsset(existingConcept, track)

  if (!result.success || !result.imageBuffer) {
    return {
      success: false,
      attempts: result.attempts,
      error: result.error,
      concept: existingConcept,
    }
  }

  const coverBuffer = await composeCover({
    imageBuffer: result.imageBuffer,
    title,
    author,
    genre,
  })

  return {
    success: true,
    coverBuffer,
    imageAssetBuffer: result.imageBuffer,
    concept: existingConcept,
    attempts: result.attempts,
  }
}

// Re-export types
export type { Concept, ConceptInput } from './concept'
export type { Track } from './prompt'
export type { QualityCheckResult } from './quality'
