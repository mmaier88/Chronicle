import { z } from 'zod';

/**
 * Scene Fingerprint - deterministic semantic signature for redundancy detection
 * Extracted by LLM from each raw scene before editing
 * Extended with Narrative Invariant Constraint extraction
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
  motifs_used: z.array(z.string()).default([]).describe('e.g., ["lighthouse", "memory", "threshold"]'),

  // === NARRATIVE CONSTRAINT EXTRACTION ===

  // Cost incurred in this scene (NCL constraint)
  cost_incurred: z.object({
    cost_type: z.enum(['identity', 'relationship', 'reputation', 'safety', 'future']),
    owner: z.string(),
    trigger: z.string(),
    description: z.string(),
    irreversible: z.boolean()
  }).nullable().default(null).describe('If someone PAID A PRICE in this scene'),

  // Reality refusal that occurred (Non-Responsive Reality constraint)
  reality_refusal: z.object({
    input: z.string(),
    output: z.string(),
    interpretation_note: z.string()
  }).nullable().default(null).describe('If universe refused to cooperate with inquiry'),

  // Interpretation model update (Interpretation Competition constraint)
  interpretation_model_update: z.object({
    model_affected: z.enum(['model_a', 'model_b', 'model_c']),
    change: z.enum(['strengthened', 'weakened', 'discredited', 'validated']),
    evidence: z.string()
  }).nullable().default(null).describe('If this scene affected competing explanations'),

  // Epistemic role signal (Role Divergence constraint)
  epistemic_role_signal: z.object({
    character: z.string(),
    role_emerging: z.enum(['witness', 'interpreter', 'resister', 'abandoner']),
    evidence: z.string()
  }).nullable().default(null).describe('If a character\'s final stance became clearer')
});

export type SceneFingerprint = z.infer<typeof SceneFingerprintSchema>;

/**
 * Epistemic Role - how a character relates to the story's truth at the end
 * Used for Role Divergence Enforcement (no two primary characters can end in same role)
 */
export const EpistemicRoleSchema = z.enum([
  'witness',      // Saw it, recorded it, but didn't internalize
  'interpreter',  // Understood and integrated the truth
  'resister',     // Rejected the truth despite evidence
  'abandoner'     // Walked away before knowing
]).nullable();

export type EpistemicRole = z.infer<typeof EpistemicRoleSchema>;

/**
 * Character State - tracks each character's arc progression
 */
export const CharacterStateSchema = z.object({
  certainty: z.number().min(0).max(1).describe('How grounded/consistent the character feels'),
  transformation: z.number().min(0).max(1).describe('How much changed from story start'),
  costs_incurred: z.array(z.string()).describe('Accumulating list of sacrifices/losses'),
  irreversible_loss: z.boolean().describe('Must become true for protagonist by end'),
  epistemic_role: EpistemicRoleSchema.default(null).describe('Final stance toward story truth - set near end'),
  is_primary: z.boolean().default(false).describe('Whether this is a main character for role divergence check')
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
 * Motif Budget Entry - tracks usage limits per motif
 * Implements Motif Saturation Ceiling constraint
 */
export const MotifBudgetSchema = z.object({
  motif: z.string(),
  introduced_in_chapter: z.number().describe('Chapter where motif first appeared'),
  reinforcement_count: z.number().default(0).describe('Times motif has been reinforced'),
  reinforcement_limit: z.number().default(3).describe('Max reinforcements allowed'),
  last_used_chapter: z.number().describe('Last chapter where motif appeared'),
  absence_window_satisfied: z.boolean().default(false).describe('Whether required absence occurred'),
  final_recurrence_used: z.boolean().default(false).describe('Whether final recurrence has been deployed')
});

export type MotifBudget = z.infer<typeof MotifBudgetSchema>;

/**
 * Repetition Registry - tracks motifs and recent fingerprints for dedup
 * Extended with motif budgeting for Saturation Ceiling
 */
export const RepetitionRegistrySchema = z.object({
  motifs: z.array(z.string()).describe('High-level motifs used (lighthouse, memory, etc.)'),
  motif_budgets: z.array(MotifBudgetSchema).default([]).describe('Per-motif usage tracking'),
  recent_fingerprints: z.array(SceneFingerprintSchema).describe('Last N accepted fingerprints')
});

export type RepetitionRegistry = z.infer<typeof RepetitionRegistrySchema>;

/**
 * Narrative Cost Entry - tracks losses/sacrifices with full metadata
 * Implements Narrative Cost Ledger (NCL) constraint
 */
export const NarrativeCostSchema = z.object({
  cost_type: z.enum(['identity', 'relationship', 'reputation', 'safety', 'future']),
  owner: z.string().describe('Character who bears this cost'),
  trigger: z.string().describe('Knowledge gained or choice made that caused this'),
  description: z.string().describe('What was lost'),
  irreversible: z.boolean().describe('Cannot be undone or optimized away'),
  scene_id: z.string().describe('Where this cost was incurred'),
  chapter: z.number()
});

export type NarrativeCost = z.infer<typeof NarrativeCostSchema>;

/**
 * Cost Ledger - global tracking of all narrative costs
 */
export const CostLedgerSchema = z.object({
  costs: z.array(NarrativeCostSchema).default([]),
  irreversible_count: z.number().default(0).describe('Must be >= 1 by book end')
});

export type CostLedger = z.infer<typeof CostLedgerSchema>;

/**
 * Interpretation Model - a competing explanation/worldview
 * Implements Interpretation Competition Phase constraint
 */
export const InterpretationModelSchema = z.object({
  id: z.enum(['model_a', 'model_b', 'model_c']),
  label: z.string().describe('e.g., "dominant intuitive", "institutionally supported", "correct but incomplete"'),
  description: z.string().describe('What this interpretation claims'),
  wins_socially: z.boolean().default(false).describe('Believed by most characters'),
  wins_empirically: z.boolean().default(false).describe('Supported by evidence'),
  feels_emotionally_true: z.boolean().default(false).describe('Resonates intuitively'),
  status: z.enum(['active', 'discredited', 'validated', 'abandoned']).default('active')
});

export type InterpretationModel = z.infer<typeof InterpretationModelSchema>;

/**
 * Interpretation Competition State
 * Tracks competing world-models and their convergence
 */
export const InterpretationCompetitionSchema = z.object({
  models_generated: z.boolean().default(false),
  models: z.array(InterpretationModelSchema).default([]),
  convergence_allowed_after: z.number().describe('Chapter index after which convergence can occur'),
  has_converged: z.boolean().default(false)
});

export type InterpretationCompetition = z.infer<typeof InterpretationCompetitionSchema>;

/**
 * Reality Refusal Entry - a moment where the universe doesn't cooperate
 * Implements Non-Responsive Reality Check constraint
 */
export const RealityRefusalSchema = z.object({
  scene_id: z.string(),
  chapter: z.number(),
  input: z.string().describe('Clear experiment or question posed'),
  output: z.string().describe('Data that does not map to any known frame'),
  interpretation_note: z.string().default('Explicitly impossible to interpret').describe('Why this resists meaning-making')
});

export type RealityRefusal = z.infer<typeof RealityRefusalSchema>;

/**
 * Reality Refusals Tracker
 */
export const RealityRefusalsSchema = z.object({
  refusals: z.array(RealityRefusalSchema).default([]),
  required_count: z.number().default(1).describe('Minimum refusals by book end'),
  injection_points: z.array(z.number()).default([]).describe('Chapters where refusals should occur')
});

export type RealityRefusals = z.infer<typeof RealityRefusalsSchema>;

/**
 * Ending Anchor - the declarative statement required at book end
 * Implements Ending Shape Constraint (ESC)
 */
export const EndingAnchorSchema = z.object({
  sentence: z.string().describe('One declarative sentence, no metaphor, no ambiguity'),
  epistemic_cost_summarized: z.string().describe('What understanding cost someone'),
  validated: z.boolean().default(false)
}).nullable();

export type EndingAnchor = z.infer<typeof EndingAnchorSchema>;

/**
 * NarrativeState - the canonical global state for book generation
 *
 * This is the single source of truth, updated after every accepted scene.
 * NEVER feed raw manuscript text back to the model - use this state + summaries.
 *
 * Includes 6 Narrative Invariant Constraints:
 * 1. Narrative Cost Ledger (NCL) - requires irreversible loss
 * 2. Interpretation Competition - competing world-models before convergence
 * 3. Motif Saturation Ceiling - budgeting with absence windows
 * 4. Non-Responsive Reality Check - universe refusals at critical points
 * 5. Ending Shape Constraint (ESC) - declarative anchor required
 * 6. Role Divergence Enforcement - epistemic roles must differ
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

  // Redundancy detection + Motif Saturation Ceiling
  repetition_registry: RepetitionRegistrySchema,

  // Current act constraints
  act_state: ActStateSchema,

  // Summaries for context (updated each chapter)
  summaries: z.object({
    book_so_far: z.string().describe('1-2 paragraph summary of everything written'),
    current_act: z.string().describe('5-10 bullet summary of current act'),
    previous_scene: z.string().describe('2-3 sentence summary of last accepted scene')
  }),

  // === NARRATIVE INVARIANT CONSTRAINTS ===

  // 1. Narrative Cost Ledger - tracks all costs, requires >= 1 irreversible
  cost_ledger: CostLedgerSchema.default({ costs: [], irreversible_count: 0 }),

  // 2. Interpretation Competition - competing explanations until midpoint
  interpretation_competition: InterpretationCompetitionSchema,

  // 3. Reality Refusals - moments of cosmic indifference
  reality_refusals: RealityRefusalsSchema.default({ refusals: [], required_count: 1, injection_points: [] }),

  // 4. Ending Anchor - declarative sentence summarizing epistemic cost
  ending_anchor: EndingAnchorSchema.default(null)
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
  const { genre, target_length_words, theme_thesis, protagonist_name } = input;

  // Calculate act structure
  const acts_total = target_length_words <= 35000 ? 3 : 5;
  const act_words_target = Math.floor(target_length_words / acts_total);
  const escalation_budget = Math.max(8, Math.round(target_length_words / 2500));

  // Calculate chapters for constraint timing
  const estimated_chapters = Math.ceil(target_length_words / 3000); // ~3k words per chapter
  const midpoint_chapter = Math.floor(estimated_chapters / 2);

  // Determine reality refusal injection points (1-2 critical moments)
  // Place them at ~40% and ~75% through the book
  const refusal_point_1 = Math.floor(estimated_chapters * 0.4);
  const refusal_point_2 = Math.floor(estimated_chapters * 0.75);

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
        irreversible_loss: false,
        epistemic_role: null,
        is_primary: true // Protagonist is always primary
      }
    },

    repetition_registry: {
      motifs: [],
      motif_budgets: [],
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
    },

    // === NARRATIVE INVARIANT CONSTRAINTS INITIALIZATION ===

    // 1. Cost Ledger - starts empty, must have >= 1 irreversible by end
    cost_ledger: {
      costs: [],
      irreversible_count: 0
    },

    // 2. Interpretation Competition - models generated early, converge after midpoint
    interpretation_competition: {
      models_generated: false,
      models: [],
      convergence_allowed_after: midpoint_chapter,
      has_converged: false
    },

    // 3. Reality Refusals - universe must refuse cooperation at least once
    reality_refusals: {
      refusals: [],
      required_count: 1,
      injection_points: [refusal_point_1, refusal_point_2]
    },

    // 4. Ending Anchor - extracted at book completion
    ending_anchor: null
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
