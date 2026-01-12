import { describe, it, expect } from 'vitest'
import {
  getCoverCompletionAction,
  canFinalizeBook,
  needsCoverRegeneration,
  shouldWaitForCover,
  CoverStatus
} from './cover-completion'

describe('Cover Completion', () => {
  describe('getCoverCompletionAction', () => {
    it('returns complete action when cover is ready', () => {
      const result = getCoverCompletionAction('ready')

      expect(result.canComplete).toBe(true)
      expect(result.action).toBe('complete')
      expect(result.progress).toBe(100)
    })

    it('returns wait action when cover is generating', () => {
      const result = getCoverCompletionAction('generating')

      expect(result.canComplete).toBe(false)
      expect(result.action).toBe('wait')
      expect(result.progress).toBe(98)
      expect(result.message).toContain('Waiting')
    })

    it('returns wait action when cover is pending', () => {
      const result = getCoverCompletionAction('pending')

      expect(result.canComplete).toBe(false)
      expect(result.action).toBe('wait')
      expect(result.progress).toBe(98)
    })

    it('returns regenerate action when cover failed', () => {
      const result = getCoverCompletionAction('failed')

      expect(result.canComplete).toBe(false)
      expect(result.action).toBe('regenerate')
      expect(result.progress).toBe(97)
      expect(result.message).toContain('Regenerating')
    })

    it('returns regenerate action when cover status is null', () => {
      const result = getCoverCompletionAction(null)

      expect(result.canComplete).toBe(false)
      expect(result.action).toBe('regenerate')
      expect(result.progress).toBe(97)
    })

    it('returns regenerate action for unknown status', () => {
      // Cast to CoverStatus to test edge case
      const result = getCoverCompletionAction('unknown' as CoverStatus)

      expect(result.canComplete).toBe(false)
      expect(result.action).toBe('regenerate')
    })
  })

  describe('canFinalizeBook', () => {
    it('returns true only when cover is ready', () => {
      expect(canFinalizeBook('ready')).toBe(true)
      expect(canFinalizeBook('generating')).toBe(false)
      expect(canFinalizeBook('pending')).toBe(false)
      expect(canFinalizeBook('failed')).toBe(false)
      expect(canFinalizeBook(null)).toBe(false)
    })
  })

  describe('needsCoverRegeneration', () => {
    it('returns true for failed status', () => {
      expect(needsCoverRegeneration('failed')).toBe(true)
    })

    it('returns true for null status', () => {
      expect(needsCoverRegeneration(null)).toBe(true)
    })

    it('returns false for ready status', () => {
      expect(needsCoverRegeneration('ready')).toBe(false)
    })

    it('returns false for generating status', () => {
      expect(needsCoverRegeneration('generating')).toBe(false)
    })

    it('returns false for pending status', () => {
      expect(needsCoverRegeneration('pending')).toBe(false)
    })
  })

  describe('shouldWaitForCover', () => {
    it('returns true for generating status', () => {
      expect(shouldWaitForCover('generating')).toBe(true)
    })

    it('returns true for pending status', () => {
      expect(shouldWaitForCover('pending')).toBe(true)
    })

    it('returns false for ready status', () => {
      expect(shouldWaitForCover('ready')).toBe(false)
    })

    it('returns false for failed status', () => {
      expect(shouldWaitForCover('failed')).toBe(false)
    })

    it('returns false for null status', () => {
      expect(shouldWaitForCover(null)).toBe(false)
    })
  })

  describe('Book finalization invariants', () => {
    const allStatuses: CoverStatus[] = ['pending', 'generating', 'ready', 'failed', null]

    it('exactly one action is recommended for each status', () => {
      for (const status of allStatuses) {
        const result = getCoverCompletionAction(status)

        // Must have exactly one valid action
        expect(['complete', 'wait', 'regenerate']).toContain(result.action)

        // canComplete must be consistent with action
        if (result.action === 'complete') {
          expect(result.canComplete).toBe(true)
        } else {
          expect(result.canComplete).toBe(false)
        }
      }
    })

    it('CRITICAL: book cannot complete without ready cover', () => {
      // This test ensures we never ship a book without a cover
      const nonReadyStatuses: CoverStatus[] = ['pending', 'generating', 'failed', null]

      for (const status of nonReadyStatuses) {
        const result = getCoverCompletionAction(status)
        expect(result.canComplete).toBe(false)
        expect(canFinalizeBook(status)).toBe(false)
      }
    })

    it('CRITICAL: ready cover always allows completion', () => {
      const result = getCoverCompletionAction('ready')
      expect(result.canComplete).toBe(true)
      expect(canFinalizeBook('ready')).toBe(true)
    })

    it('progress is always between 97 and 100 during finalization', () => {
      for (const status of allStatuses) {
        const result = getCoverCompletionAction(status)
        expect(result.progress).toBeGreaterThanOrEqual(97)
        expect(result.progress).toBeLessThanOrEqual(100)
      }
    })

    it('helper functions are consistent with main action function', () => {
      for (const status of allStatuses) {
        const result = getCoverCompletionAction(status)

        // canFinalizeBook should match canComplete
        expect(canFinalizeBook(status)).toBe(result.canComplete)

        // shouldWaitForCover should match wait action
        if (result.action === 'wait') {
          expect(shouldWaitForCover(status)).toBe(true)
        }

        // needsCoverRegeneration should match regenerate action
        if (result.action === 'regenerate') {
          expect(needsCoverRegeneration(status)).toBe(true)
        }
      }
    })
  })
})
