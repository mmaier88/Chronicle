/**
 * Cover Completion Logic
 *
 * Utilities for ensuring covers are ready before book completion.
 * Used by the tick route finalization step.
 */

export type CoverStatus = 'pending' | 'generating' | 'ready' | 'failed' | null

export interface CoverCompletionResult {
  canComplete: boolean
  action: 'complete' | 'wait' | 'regenerate'
  message: string
  progress: number
}

/**
 * Determine what action to take based on cover status during finalization
 */
export function getCoverCompletionAction(coverStatus: CoverStatus): CoverCompletionResult {
  // Cover is ready - can complete the book
  if (coverStatus === 'ready') {
    return {
      canComplete: true,
      action: 'complete',
      message: 'Cover ready, finalizing book',
      progress: 100
    }
  }

  // Cover is still generating - wait for it
  if (coverStatus === 'generating' || coverStatus === 'pending') {
    return {
      canComplete: false,
      action: 'wait',
      message: 'Waiting for cover to finish generating...',
      progress: 98
    }
  }

  // Cover failed or was never started - need to regenerate
  if (coverStatus === 'failed' || coverStatus === null) {
    return {
      canComplete: false,
      action: 'regenerate',
      message: 'Regenerating cover...',
      progress: 97
    }
  }

  // Unknown status - treat as needing regeneration
  return {
    canComplete: false,
    action: 'regenerate',
    message: 'Cover status unknown, regenerating...',
    progress: 97
  }
}

/**
 * Check if a book can be finalized based on its cover status
 */
export function canFinalizeBook(coverStatus: CoverStatus): boolean {
  return coverStatus === 'ready'
}

/**
 * Check if cover needs regeneration
 */
export function needsCoverRegeneration(coverStatus: CoverStatus): boolean {
  return coverStatus === 'failed' || coverStatus === null
}

/**
 * Check if we should wait for cover generation
 */
export function shouldWaitForCover(coverStatus: CoverStatus): boolean {
  return coverStatus === 'generating' || coverStatus === 'pending'
}
