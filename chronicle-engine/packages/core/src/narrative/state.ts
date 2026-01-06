import { z } from 'zod';

/**
 * Scene Fingerprint - deterministic semantic signature for redundancy detection
 * Extracted by LLM from each raw scene before editing
 */
export const SceneFingerprintSchema = z.object({
  scene_id: z.string(),
  narrative_function: z.enum([
    'discovery',      // new information revealed
    'confirmation',   // suspected truth confirmed
    'escalation',     // stakes raised
    'consequence',    // action leads to result
    'reversal',       // expectation subverted
    'surrender',      // character yields/accepts
    'resolution'      // question answered definitively
  ]),
  new_information: z.string().describe('One sentence: what does reader learn that they didn\'t know?'),
  consequence_introduced: z.string().nullable().default(null).describe('One sentence: what irreversible change occurred?'),
  emotional_delta: z.number().min(-1).max(1).default(0).describe('-1 to +1: emotional trajectory shift'),
  escalation_delta: z.number().min(0).max(1).default(0).describe('0 to 1: how much stakes increased'),
  character_impacts: z.array(z.object({
    name: z.string(),
    certainty_delta: z.number().min(-1).max(1).default(0),
    transformation_delta: z.number().min(0).max(1).default(0),
    cost_added: z.string().optional()
  })).default([]),
  unresolved_question_changes: z.object({
    added: z.array(z.string()).default([]),
    resolved: z.array(z.string()).default([]),
    reframed: z.array(z.string()).default([])
  }).default({ added: [], resolved: [], reframed: [] }),
  motifs_used: z.array(z.string()).default([]).describe('e.g., ["lighthouse", "memory", "threshold"]')
});

export type SceneFingerprint = z.infer<typeof SceneFingerprintSchema>;

/**
 * Character State - tracks each character's arc progression
 */
export const CharacterStateSchema = z.object({
  certainty: z.number().min(0).max(1).describe('How grounded/consistent the character feels'),
  transformation: z.number().min(0).max(1).describe('How much changed from story start'),
  costs_incurred: z.array(z.string()).describe('Accumulating list of sacrifices/losses'),
  irreversible_loss: z.boolean().describe('Must become true for protagonist by end')
});

export type CharacterState = z.infer<typeof CharacterStateSchema>;

/**
 * Act State - constraints for the current act
 */
export const ActStateSchema = z.object({
  act_goal: z.string().describe('What this act must accomplish'),
  act_open_questions: z.array(z.string()).describe('Questions opened in this act'),
  act_close_conditions: z.array(z.string()).describe('What must happen to end this act'),
  act_words_target: z.number().describe('Word count target for this act'),
  act_words_written: z.number().describe('Accepted words written so far in act')
});

export type ActState = z.infer<typeof ActStateSchema>;

/**
 * Progression Metrics - abstract tracking of story feel
 */
export const ProgressionMetricsSchema = z.object({
  mystery_level: z.number().min(0).max(1).describe('How much is unknown/hidden'),
  clarity_level: z.number().min(0).max(1).describe('How much has been revealed/understood'),
  emotional_intensity: z.number().min(0).max(1).describe('Current emotional stakes'),
  narrative_velocity: z.number().min(0).max(1).describe('Pacing speed')
});

export type ProgressionMetrics = z.infer<typeof ProgressionMetricsSchema>;

/**
 * Structure Tracking - where we are in the book
 */
export const StructureSchema = z.object({
  acts_total: z.number().min(1).max(7).describe('3 for short, 5 for long books'),
  act_index: z.number().min(1).describe('1-based current act'),
  chapter_index: z.number().min(1).describe('1-based current chapter within act'),
  scene_index: z.number().min(1).describe('1-based scene within chapter'),
  words_written: z.number().min(0).describe('Total accepted words')
});

export type Structure = z.infer<typeof StructureSchema>;

/**
 * Escalation Budget - prevents endless escalation
 */
export const EscalationBudgetSchema = z.object({
  remaining: z.number().min(0).describe('Decrement on each accepted escalation'),
  last_escalation_scene_id: z.string().nullable()
});

export type EscalationBudget = z.infer<typeof EscalationBudgetSchema>;

/**
 * Repetition Registry - tracks motifs and recent fingerprints for dedup
 */
export const RepetitionRegistrySchema = z.object({
  motifs: z.array(z.string()).describe('High-level motifs used (lighthouse, memory, etc.)'),
  recent_fingerprints: z.array(SceneFingerprintSchema).describe('Last N accepted fingerprints')
});

export type RepetitionRegistry = z.infer<typeof RepetitionRegistrySchema>;

/**
 * NarrativeState - the canonical global state for book generation
 *
 * This is the single source of truth, updated after every accepted scene.
 * NEVER feed raw manuscript text back to the model - use this state + summaries.
 */
export const NarrativeStateSchema = z.object({
  // Core identity
  theme_thesis: z.string().describe('The book\'s central argument/insight'),
  genre: z.string().describe('e.g., "literary thriller", "dark fantasy"'),
  target_length_words: z.number().min(10000).max(150000),

  // Position tracking
  structure: StructureSchema,

  // Emotional/pacing metrics
  progression: ProgressionMetricsSchema,

  // Escalation control
  escalation_budget: EscalationBudgetSchema,

  // Plot tracking
  unresolved_questions: z.array(z.string()).describe('Must shrink or transform over time'),

  // Character arcs
  characters: z.record(z.string(), CharacterStateSchema),

  // Redundancy detection
  repetition_registry: RepetitionRegistrySchema,

  // Current act constraints
  act_state: ActStateSchema,

  // Summaries for context (updated each chapter)
  summaries: z.object({
    book_so_far: z.string().describe('1-2 paragraph summary of everything written'),
    current_act: z.string().describe('5-10 bullet summary of current act'),
    previous_scene: z.string().describe('2-3 sentence summary of last accepted scene')
  })
});

export type NarrativeState = z.infer<typeof NarrativeStateSchema>;

/**
 * Create initial NarrativeState from user input
 */
export function createInitialState(input: {
  prompt: string;
  genre: string;
  target_length_words: number;
  theme_thesis: string;
  protagonist_name: string;
}): NarrativeState {
  const { prompt, genre, target_length_words, theme_thesis, protagonist_name } = input;

  // Calculate act structure
  const acts_total = target_length_words <= 35000 ? 3 : 5;
  const act_words_target = Math.floor(target_length_words / acts_total);
  const escalation_budget = Math.max(8, Math.round(target_length_words / 2500));

  return {
    theme_thesis,
    genre,
    target_length_words,

    structure: {
      acts_total,
      act_index: 1,
      chapter_index: 1,
      scene_index: 1,
      words_written: 0
    },

    progression: {
      mystery_level: 0.3,
      clarity_level: 0.1,
      emotional_intensity: 0.2,
      narrative_velocity: 0.4
    },

    escalation_budget: {
      remaining: escalation_budget,
      last_escalation_scene_id: null
    },

    unresolved_questions: [],

    characters: {
      [protagonist_name]: {
        certainty: 0.3,
        transformation: 0,
        costs_incurred: [],
        irreversible_loss: false
      }
    },

    repetition_registry: {
      motifs: [],
      recent_fingerprints: []
    },

    act_state: {
      act_goal: 'Establish the ordinary world and inciting incident',
      act_open_questions: [],
      act_close_conditions: ['Protagonist commits to the journey'],
      act_words_target,
      act_words_written: 0
    },

    summaries: {
      book_so_far: '',
      current_act: '',
      previous_scene: ''
    }
  };
}

/**
 * Validate that a state mutation is meaningful
 * Returns list of issues if invalid
 */
export function validateStateMutation(
  before: NarrativeState,
  after: NarrativeState
): string[] {
  const issues: string[] = [];

  // Words must increase
  if (after.structure.words_written <= before.structure.words_written) {
    issues.push('No words added - scene must contribute content');
  }

  // At least one meaningful change must occur
  const hasQuestionChange =
    after.unresolved_questions.length !== before.unresolved_questions.length ||
    JSON.stringify(after.unresolved_questions) !== JSON.stringify(before.unresolved_questions);

  const hasCharacterChange = Object.keys(after.characters).some(name => {
    const beforeChar = before.characters[name];
    const afterChar = after.characters[name];
    if (!beforeChar || !afterChar) return true;
    return (
      afterChar.transformation > beforeChar.transformation ||
      afterChar.costs_incurred.length > beforeChar.costs_incurred.length ||
      afterChar.irreversible_loss !== beforeChar.irreversible_loss
    );
  });

  const hasProgressionChange =
    Math.abs(after.progression.mystery_level - before.progression.mystery_level) > 0.05 ||
    Math.abs(after.progression.clarity_level - before.progression.clarity_level) > 0.05 ||
    Math.abs(after.progression.emotional_intensity - before.progression.emotional_intensity) > 0.05;

  if (!hasQuestionChange && !hasCharacterChange && !hasProgressionChange) {
    issues.push('No meaningful state change - scene must advance plot, character, or tension');
  }

  return issues;
}

/**
 * Constants for state management
 */
export const STATE_CONSTANTS = {
  FINGERPRINT_WINDOW_SIZE: 20,
  JACCARD_DUPLICATE_THRESHOLD: 0.65,
  MAX_SCENE_REGENERATIONS: 3,
  MAX_ACT_TAIL_REGENERATIONS: 2,
  MAX_FINAL_TAIL_REGENERATIONS: 2,
  ACT_TAIL_REGENERATE_PERCENT: 0.15,
  FINAL_TAIL_REGENERATE_PERCENT: 0.20,
  SCENE_RAW_WORDS_MIN: 1200,
  SCENE_RAW_WORDS_MAX: 2500,
  SCENE_EDITED_WORDS_MIN: 900,
  SCENE_EDITED_WORDS_MAX: 1800
} as const;
