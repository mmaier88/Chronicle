// Slider Configuration - Labels, Descriptions, and Genre Defaults

import type { BookGenre, StorySliders } from '@/types/chronicle'

export interface SliderConfig {
  name: string
  labels: [string, string, string] // [min, mid, max] for 3-position UI
  descriptions: Record<1 | 2 | 3 | 4 | 5, string>
  isAdvanced: boolean
}

export const SLIDER_CONFIG: Record<keyof StorySliders, SliderConfig> = {
  violence: {
    name: 'Violence',
    labels: ['Minimal', 'Balanced', 'Brutal'],
    descriptions: {
      1: 'safe, implied, off-screen',
      2: 'mentioned but not shown',
      3: 'action-level, non-graphic',
      4: 'visceral, some gore',
      5: 'brutal, explicit, graphic',
    },
    isAdvanced: false,
  },
  romance: {
    name: 'Romance',
    labels: ['Minimal', 'Balanced', 'Steamy'],
    descriptions: {
      1: 'none or subtext only',
      2: 'light romantic tension',
      3: 'slow burn, emotional intimacy',
      4: 'passionate, sensual',
      5: 'explicit, erotic',
    },
    isAdvanced: false,
  },
  tone: {
    name: 'Tone',
    labels: ['Hopeful', 'Bittersweet', 'Tragic'],
    descriptions: {
      1: 'uplifting, resilient, triumph',
      2: 'challenges with hope',
      3: 'mixed outcome, melancholy',
      4: 'heavy, somber, loss',
      5: 'bleak, devastating, tragic',
    },
    isAdvanced: false,
  },
  darkness: {
    name: 'Darkness',
    labels: ['Light', 'Gray', 'Dark'],
    descriptions: {
      1: 'wholesome, optimistic themes',
      2: 'mild tension and conflict',
      3: 'morally complex, shadows',
      4: 'bleak undertones, despair',
      5: 'grimdark, nihilistic',
    },
    isAdvanced: true,
  },
  emotionalIntensity: {
    name: 'Emotional Intensity',
    labels: ['Gentle', 'Moderate', 'Intense'],
    descriptions: {
      1: 'light emotional touch',
      2: 'grounded feelings',
      3: 'meaningful emotional beats',
      4: 'deeply felt, raw',
      5: 'overwhelming, cathartic',
    },
    isAdvanced: true,
  },
  languageComplexity: {
    name: 'Language',
    labels: ['Simple', 'Standard', 'Literary'],
    descriptions: {
      1: 'clear, accessible prose',
      2: 'conversational, direct',
      3: 'polished, varied',
      4: 'rich, layered',
      5: 'dense, experimental',
    },
    isAdvanced: true,
  },
  plotComplexity: {
    name: 'Plot',
    labels: ['Streamlined', 'Balanced', 'Intricate'],
    descriptions: {
      1: 'single clear thread',
      2: 'main plot with minor arcs',
      3: 'multiple interweaving threads',
      4: 'complex narrative structure',
      5: 'labyrinthine, non-linear',
    },
    isAdvanced: true,
  },
  pacing: {
    name: 'Pacing',
    labels: ['Leisurely', 'Steady', 'Relentless'],
    descriptions: {
      1: 'slow, contemplative',
      2: 'measured, breathing room',
      3: 'balanced momentum',
      4: 'brisk, propulsive',
      5: 'breakneck, no rest',
    },
    isAdvanced: true,
  },
  realism: {
    name: 'Realism',
    labels: ['Fantastical', 'Grounded', 'Gritty'],
    descriptions: {
      1: 'dreamlike, magical logic',
      2: 'stylized, genre conventions',
      3: 'believable, internally consistent',
      4: 'realistic consequences',
      5: 'unflinching, documentary-like',
    },
    isAdvanced: true,
  },
  worldDetail: {
    name: 'World Detail',
    labels: ['Minimal', 'Functional', 'Rich'],
    descriptions: {
      1: 'sketched, character-focused',
      2: 'essential details only',
      3: 'lived-in, textured',
      4: 'immersive, detailed',
      5: 'encyclopedic depth',
    },
    isAdvanced: true,
  },
  characterDepth: {
    name: 'Character Depth',
    labels: ['Archetypal', 'Developed', 'Layered'],
    descriptions: {
      1: 'clear types, functional',
      2: 'distinct personalities',
      3: 'nuanced, contradictions',
      4: 'deeply realized',
      5: 'psychologically complex',
    },
    isAdvanced: true,
  },
  moralClarity: {
    name: 'Moral Clarity',
    labels: ['Clear', 'Nuanced', 'Ambiguous'],
    descriptions: {
      1: 'good vs evil, heroes win',
      2: 'clear sides with complexity',
      3: 'everyone has reasons',
      4: 'no easy answers',
      5: 'deliberately unsettling',
    },
    isAdvanced: true,
  },
  shockValue: {
    name: 'Shock Value',
    labels: ['Safe', 'Moderate', 'Provocative'],
    descriptions: {
      1: 'comfortable, expected',
      2: 'occasional surprises',
      3: 'memorable twists',
      4: 'disturbing moments',
      5: 'transgressive, boundary-pushing',
    },
    isAdvanced: true,
  },
  explicitSafeguard: {
    name: 'Content Guard',
    labels: ['Strict', 'Standard', 'Relaxed'],
    descriptions: {
      1: 'all-ages appropriate',
      2: 'teen-appropriate (PG-13)',
      3: 'adult themes (R)',
      4: 'mature content (NC-17)',
      5: 'explicit/unrestricted',
    },
    isAdvanced: true,
  },
}

// Genre defaults for when sliders are "auto"
export const GENRE_SLIDER_DEFAULTS: Record<BookGenre, Partial<StorySliders>> = {
  literary_fiction: {
    violence: 2,
    romance: 2,
    tone: 3,
    darkness: 3,
    emotionalIntensity: 4,
    languageComplexity: 4,
    plotComplexity: 3,
    pacing: 2,
    realism: 4,
    worldDetail: 3,
    characterDepth: 5,
    moralClarity: 2,
    shockValue: 2,
    explicitSafeguard: 3,
  },
  non_fiction: {
    violence: 1,
    romance: 1,
    tone: 2,
    darkness: 2,
    emotionalIntensity: 3,
    languageComplexity: 3,
    plotComplexity: 2,
    pacing: 3,
    realism: 5,
    worldDetail: 4,
    characterDepth: 3,
    moralClarity: 3,
    shockValue: 1,
    explicitSafeguard: 3,
  },
}

// Helper to get visible (non-advanced) sliders
export const VISIBLE_SLIDERS = (
  Object.keys(SLIDER_CONFIG) as Array<keyof StorySliders>
).filter((key) => !SLIDER_CONFIG[key].isAdvanced)

// Helper to get advanced sliders
export const ADVANCED_SLIDERS = (
  Object.keys(SLIDER_CONFIG) as Array<keyof StorySliders>
).filter((key) => SLIDER_CONFIG[key].isAdvanced)
