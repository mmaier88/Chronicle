// Slider Resolution - Auto-inference logic for "auto" slider values

import type {
  BookGenre,
  ResolvedSliders,
  SliderValue,
  StorySliders,
} from '@/types/chronicle'
import { GENRE_SLIDER_DEFAULTS } from './slider-config'

type NumericSliderValue = 1 | 2 | 3 | 4 | 5

/**
 * Resolve all "auto" slider values to concrete numbers.
 *
 * Resolution order:
 * 1. User-set values (absolute priority)
 * 2. Inference from other slider values
 * 3. Genre defaults
 * 4. Fallback to 3 (balanced)
 */
export function resolveSliders(
  sliders: StorySliders,
  genre: BookGenre
): ResolvedSliders {
  const resolved = { ...sliders } as Record<keyof StorySliders, SliderValue>

  // Step 1: Apply inference rules based on user-set values
  applyInferenceRules(resolved)

  // Step 2: Apply genre defaults for remaining autos
  const genreDefaults = GENRE_SLIDER_DEFAULTS[genre] || {}
  for (const key of Object.keys(resolved) as Array<keyof StorySliders>) {
    if (resolved[key] === 'auto') {
      resolved[key] = genreDefaults[key] ?? 3
    }
  }

  // Step 3: Apply safety constraints
  applySafetyConstraints(resolved as Record<keyof StorySliders, NumericSliderValue>)

  return resolved as ResolvedSliders
}

/**
 * Inference rules: if certain sliders are set, infer related ones
 */
function applyInferenceRules(
  sliders: Record<keyof StorySliders, SliderValue>
): void {
  // High romance implies emotional depth
  if (isSet(sliders.romance) && asNum(sliders.romance) >= 3) {
    if (sliders.emotionalIntensity === 'auto') {
      sliders.emotionalIntensity = Math.max(3, asNum(sliders.romance) - 1) as NumericSliderValue
    }
    if (sliders.characterDepth === 'auto') {
      sliders.characterDepth = Math.max(3, asNum(sliders.romance) - 1) as NumericSliderValue
    }
  }

  // High violence implies darkness and shock
  if (isSet(sliders.violence) && asNum(sliders.violence) >= 4) {
    if (sliders.darkness === 'auto') {
      sliders.darkness = Math.min(5, asNum(sliders.violence)) as NumericSliderValue
    }
    if (sliders.shockValue === 'auto') {
      sliders.shockValue = Math.max(3, asNum(sliders.violence) - 1) as NumericSliderValue
    }
  }

  // Tragic tone implies darkness and emotional intensity
  if (isSet(sliders.tone) && asNum(sliders.tone) >= 4) {
    if (sliders.darkness === 'auto') {
      sliders.darkness = Math.max(3, asNum(sliders.tone) - 1) as NumericSliderValue
    }
    if (sliders.emotionalIntensity === 'auto') {
      sliders.emotionalIntensity = Math.max(3, asNum(sliders.tone)) as NumericSliderValue
    }
  }

  // Hopeful tone implies lower darkness
  if (isSet(sliders.tone) && asNum(sliders.tone) <= 2) {
    if (sliders.darkness === 'auto') {
      sliders.darkness = Math.min(2, asNum(sliders.tone)) as NumericSliderValue
    }
  }

  // High darkness implies moral ambiguity
  if (isSet(sliders.darkness) && asNum(sliders.darkness) >= 4) {
    if (sliders.moralClarity === 'auto') {
      sliders.moralClarity = Math.max(3, asNum(sliders.darkness) - 1) as NumericSliderValue
    }
  }

  // High language complexity implies character depth
  if (isSet(sliders.languageComplexity) && asNum(sliders.languageComplexity) >= 4) {
    if (sliders.characterDepth === 'auto') {
      sliders.characterDepth = Math.max(3, asNum(sliders.languageComplexity) - 1) as NumericSliderValue
    }
  }

  // High plot complexity implies slower pacing
  if (isSet(sliders.plotComplexity) && asNum(sliders.plotComplexity) >= 4) {
    if (sliders.pacing === 'auto') {
      sliders.pacing = Math.max(1, 5 - asNum(sliders.plotComplexity) + 1) as NumericSliderValue
    }
  }
}

/**
 * Safety constraints: ensure explicit safeguard is appropriate
 */
function applySafetyConstraints(
  sliders: Record<keyof StorySliders, NumericSliderValue>
): void {
  // High romance (5 = explicit) requires relaxed content guard
  if (sliders.romance === 5 && sliders.explicitSafeguard < 4) {
    sliders.explicitSafeguard = 4
  }

  // Extreme violence requires at least R rating
  if (sliders.violence === 5 && sliders.explicitSafeguard < 3) {
    sliders.explicitSafeguard = 3
  }

  // High shock value requires mature rating
  if (sliders.shockValue >= 4 && sliders.explicitSafeguard < 3) {
    sliders.explicitSafeguard = 3
  }
}

// Helpers
function isSet(value: SliderValue): value is NumericSliderValue {
  return value !== 'auto'
}

function asNum(value: SliderValue): NumericSliderValue {
  return value === 'auto' ? 3 : value
}

/**
 * Check if any slider has been modified from default "auto"
 */
export function hasCustomSliders(sliders: StorySliders): boolean {
  return Object.values(sliders).some((v) => v !== 'auto')
}

/**
 * Count how many sliders are set (not "auto")
 */
export function countSetSliders(sliders: StorySliders): number {
  return Object.values(sliders).filter((v) => v !== 'auto').length
}
