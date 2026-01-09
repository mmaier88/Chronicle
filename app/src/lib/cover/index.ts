/**
 * Chronicle Cover System
 *
 * AI generates images. Chronicle designs covers.
 */

export {
  generateCover,
  generateImageAsset,
  regenerateCover,
  type CoverPipelineInput,
  type CoverPipelineResult,
  type Concept,
  type ConceptInput,
  type Track,
  type QualityCheckResult,
} from './pipeline'

export { composeCover, resizeForCover, COVER_WIDTH, COVER_HEIGHT } from './typography'

export { distillConcept } from './concept'

export { runQualityChecks, quickTextCheck } from './quality'
