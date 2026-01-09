import { z } from 'zod';
import { LLMClient, RequestContext } from '../llm/client.js';
import { EDITOR_SYSTEM_PROMPT, FINGERPRINT_SYSTEM_PROMPT, generateEditorPrompt } from '../llm/prompts.js';
import { NarrativeState, SceneFingerprint, SceneFingerprintSchema } from '../narrative/state.js';
import { checkRedundancy, RedundancyCheckResult } from '../narrative/fingerprint.js';

/**
 * Editor decision types
 */
export type EditorDecision = 'ACCEPT' | 'REWRITE' | 'MERGE' | 'REGENERATE' | 'DROP';

/**
 * State patch - partial updates to NarrativeState
 * Extended with Narrative Invariant Constraint updates
 */
export const StatePatchSchema = z.object({
  // Words added
  words_added: z.number().optional(),

  // Progression updates
  progression: z.object({
    mystery_level: z.number().min(0).max(1).optional(),
    clarity_level: z.number().min(0).max(1).optional(),
    emotional_intensity: z.number().min(0).max(1).optional(),
    narrative_velocity: z.number().min(0).max(1).optional()
  }).optional(),

  // Escalation budget decrement
  escalation_spent: z.number().optional(),

  // Question changes
  questions: z.object({
    add: z.array(z.string()).optional(),
    resolve: z.array(z.string()).optional(),
    reframe: z.array(z.object({
      old: z.string(),
      new: z.string()
    })).optional()
  }).optional(),

  // Character updates (extended with epistemic roles)
  characters: z.record(z.string(), z.object({
    certainty_delta: z.number().optional(),
    transformation_delta: z.number().optional(),
    cost_added: z.string().optional(),
    irreversible_loss: z.boolean().optional(),
    epistemic_role: z.enum(['witness', 'interpreter', 'resister', 'abandoner']).nullable().optional(),
    is_primary: z.boolean().optional()
  })).optional(),

  // Motifs added
  motifs_added: z.array(z.string()).optional(),

  // Summary update for this scene
  scene_summary: z.string().optional(),

  // === NARRATIVE CONSTRAINT UPDATES ===

  // Cost ledger update (NCL constraint)
  cost_incurred: z.object({
    cost_type: z.enum(['identity', 'relationship', 'reputation', 'safety', 'future']),
    owner: z.string(),
    trigger: z.string(),
    description: z.string(),
    irreversible: z.boolean()
  }).optional(),

  // Reality refusal to add (Non-Responsive Reality constraint)
  reality_refusal: z.object({
    input: z.string(),
    output: z.string(),
    interpretation_note: z.string()
  }).optional(),

  // Interpretation model update (Interpretation Competition constraint)
  interpretation_update: z.object({
    model_id: z.enum(['model_a', 'model_b', 'model_c']),
    wins_socially: z.boolean().optional(),
    wins_empirically: z.boolean().optional(),
    feels_emotionally_true: z.boolean().optional(),
    status: z.enum(['active', 'discredited', 'validated', 'abandoned']).optional()
  }).optional(),

  // Motif budget update (Motif Saturation Ceiling)
  motif_budget_update: z.object({
    motif: z.string(),
    absence_satisfied: z.boolean().optional()
  }).optional()
});

export type StatePatch = z.infer<typeof StatePatchSchema>;

/**
 * Editor output schema
 * Note: fingerprint is NOT included here - we extract it separately and merge it in
 */
export const EditorOutputSchema = z.object({
  decision: z.enum(['ACCEPT', 'REWRITE', 'MERGE', 'REGENERATE', 'DROP']),
  edited_text: z.string().optional(),
  state_patch: StatePatchSchema.optional(),
  instructions: z.string().optional(),
  reason: z.string()
});

export type EditorOutput = z.infer<typeof EditorOutputSchema>;

/**
 * EditorEvaluation - the return type of evaluateScene
 * This always includes a fingerprint (extracted separately, not from LLM)
 */
export type EditorEvaluation = Omit<EditorOutput, 'fingerprint'> & {
  fingerprint: SceneFingerprint;
};

/**
 * Editor Agent - enforces editorial discipline
 *
 * The Editor is RUTHLESS. It is the authority. It:
 * - Extracts fingerprints to detect redundancy
 * - Validates state mutations
 * - Cuts 10-20% of accepted scenes
 * - Rejects scenes that don't advance the story
 * - Orders regeneration when needed
 */
export class EditorAgent {
  constructor(private llm: LLMClient) {}

  /**
   * Extract fingerprint from raw scene
   */
  async extractFingerprint(
    rawScene: string,
    sceneId: string,
    state: NarrativeState,
    context: RequestContext
  ): Promise<SceneFingerprint> {
    const userPrompt = `Extract the narrative fingerprint from this scene.

Scene ID: ${sceneId}

## CONTEXT
Genre: ${state.genre}
Current act: ${state.structure.act_index}/${state.structure.acts_total}
Theme: ${state.theme_thesis}

## SCENE TEXT
${rawScene}

---

Extract the fingerprint as JSON.`;

    const response = await this.llm.generateJSON({
      systemPrompt: FINGERPRINT_SYSTEM_PROMPT,
      userPrompt,
      schema: SceneFingerprintSchema,
      context: { ...context, agent: 'fingerprint' }
    });

    return { ...response.content, scene_id: sceneId };
  }

  /**
   * Evaluate a raw scene and decide what to do with it
   */
  async evaluateScene(
    rawScene: string,
    sceneId: string,
    state: NarrativeState,
    context: RequestContext
  ): Promise<EditorEvaluation> {
    // First, extract fingerprint
    const fingerprint = await this.extractFingerprint(rawScene, sceneId, state, context);

    // Check redundancy using our deterministic rules
    const redundancyCheck = checkRedundancy(
      fingerprint,
      state.repetition_registry.recent_fingerprints
    );

    // If clearly redundant, short-circuit to REGENERATE
    if (redundancyCheck.is_redundant) {
      return {
        decision: 'REGENERATE',
        fingerprint,
        reason: redundancyCheck.reason!,
        instructions: redundancyCheck.suggestion!
      };
    }

    // Full LLM evaluation
    const userPrompt = generateEditorPrompt(
      state,
      rawScene,
      state.repetition_registry.recent_fingerprints
    );

    const response = await this.llm.generateJSON({
      systemPrompt: EDITOR_SYSTEM_PROMPT,
      userPrompt,
      schema: EditorOutputSchema,
      context
    });

    // Override fingerprint with our extracted one (LLM may have slight variations)
    return {
      ...response.content,
      fingerprint
    };
  }

  /**
   * Apply a state patch to update NarrativeState
   * @param sceneId - The scene ID for tracking in constraint updates
   */
  applyStatePatch(state: NarrativeState, patch: StatePatch, sceneId: string = 'unknown'): NarrativeState {
    const newState = structuredClone(state);

    // Update words
    if (patch.words_added) {
      newState.structure.words_written += patch.words_added;
      newState.act_state.act_words_written += patch.words_added;
    }

    // Update progression
    if (patch.progression) {
      if (patch.progression.mystery_level !== undefined) {
        newState.progression.mystery_level = patch.progression.mystery_level;
      }
      if (patch.progression.clarity_level !== undefined) {
        newState.progression.clarity_level = patch.progression.clarity_level;
      }
      if (patch.progression.emotional_intensity !== undefined) {
        newState.progression.emotional_intensity = patch.progression.emotional_intensity;
      }
      if (patch.progression.narrative_velocity !== undefined) {
        newState.progression.narrative_velocity = patch.progression.narrative_velocity;
      }
    }

    // Decrement escalation budget
    if (patch.escalation_spent) {
      newState.escalation_budget.remaining = Math.max(
        0,
        newState.escalation_budget.remaining - patch.escalation_spent
      );
    }

    // Update questions
    if (patch.questions) {
      if (patch.questions.add) {
        newState.unresolved_questions.push(...patch.questions.add);
      }
      if (patch.questions.resolve) {
        newState.unresolved_questions = newState.unresolved_questions.filter(
          q => !patch.questions!.resolve!.some(r => q.toLowerCase().includes(r.toLowerCase()))
        );
      }
      if (patch.questions.reframe) {
        for (const { old, new: newQ } of patch.questions.reframe) {
          const idx = newState.unresolved_questions.findIndex(
            q => q.toLowerCase().includes(old.toLowerCase())
          );
          if (idx >= 0) {
            newState.unresolved_questions[idx] = newQ;
          }
        }
      }
    }

    // Update characters
    if (patch.characters) {
      for (const [name, updates] of Object.entries(patch.characters)) {
        if (!newState.characters[name]) {
          newState.characters[name] = {
            certainty: 0.5,
            transformation: 0,
            costs_incurred: [],
            irreversible_loss: false,
            epistemic_role: null,
            is_primary: false
          };
        }
        const char = newState.characters[name];

        if (updates.certainty_delta) {
          char.certainty = Math.max(0, Math.min(1, char.certainty + updates.certainty_delta));
        }
        if (updates.transformation_delta) {
          char.transformation = Math.max(0, Math.min(1, char.transformation + updates.transformation_delta));
        }
        if (updates.cost_added) {
          char.costs_incurred.push(updates.cost_added);
        }
        if (updates.irreversible_loss !== undefined) {
          char.irreversible_loss = updates.irreversible_loss;
        }
        // Handle epistemic role updates
        if (updates.epistemic_role !== undefined) {
          char.epistemic_role = updates.epistemic_role;
        }
        // Handle primary character designation
        if (updates.is_primary !== undefined) {
          char.is_primary = updates.is_primary;
        }
      }
    }

    // Add motifs and update motif budgets
    if (patch.motifs_added) {
      for (const motif of patch.motifs_added) {
        if (!newState.repetition_registry.motifs.includes(motif)) {
          newState.repetition_registry.motifs.push(motif);
        }

        // Update motif budget tracking
        if (!newState.repetition_registry.motif_budgets) {
          newState.repetition_registry.motif_budgets = [];
        }

        let budget = newState.repetition_registry.motif_budgets.find(b => b.motif === motif);
        if (!budget) {
          // New motif - initialize budget
          budget = {
            motif,
            introduced_in_chapter: newState.structure.chapter_index,
            reinforcement_count: 0,
            reinforcement_limit: 3,
            last_used_chapter: newState.structure.chapter_index,
            absence_window_satisfied: false,
            final_recurrence_used: false
          };
          newState.repetition_registry.motif_budgets.push(budget);
        } else {
          // Existing motif - check for absence window
          const chapterGap = newState.structure.chapter_index - budget.last_used_chapter;
          if (chapterGap > 1) {
            budget.absence_window_satisfied = true;
          }
          budget.reinforcement_count++;
          budget.last_used_chapter = newState.structure.chapter_index;
        }
      }
    }

    // Update scene summary
    if (patch.scene_summary) {
      newState.summaries.previous_scene = patch.scene_summary;
    }

    // === NARRATIVE CONSTRAINT UPDATES ===

    // Process cost incurred (NCL constraint)
    if (patch.cost_incurred) {
      if (!newState.cost_ledger) {
        newState.cost_ledger = { costs: [], irreversible_count: 0 };
      }
      newState.cost_ledger.costs.push({
        ...patch.cost_incurred,
        scene_id: sceneId,
        chapter: newState.structure.chapter_index
      });
      if (patch.cost_incurred.irreversible) {
        newState.cost_ledger.irreversible_count++;
      }
    }

    // Process reality refusal (Non-Responsive Reality constraint)
    if (patch.reality_refusal) {
      if (!newState.reality_refusals) {
        newState.reality_refusals = { refusals: [], required_count: 1, injection_points: [] };
      }
      newState.reality_refusals.refusals.push({
        ...patch.reality_refusal,
        scene_id: sceneId,
        chapter: newState.structure.chapter_index
      });
    }

    // Process interpretation model update (Interpretation Competition constraint)
    if (patch.interpretation_update && newState.interpretation_competition?.models) {
      const model = newState.interpretation_competition.models.find(
        m => m.id === patch.interpretation_update!.model_id
      );
      if (model) {
        if (patch.interpretation_update.wins_socially !== undefined) {
          model.wins_socially = patch.interpretation_update.wins_socially;
        }
        if (patch.interpretation_update.wins_empirically !== undefined) {
          model.wins_empirically = patch.interpretation_update.wins_empirically;
        }
        if (patch.interpretation_update.feels_emotionally_true !== undefined) {
          model.feels_emotionally_true = patch.interpretation_update.feels_emotionally_true;
        }
        if (patch.interpretation_update.status !== undefined) {
          model.status = patch.interpretation_update.status;
        }
      }
    }

    // Process motif budget update (explicit absence marking)
    if (patch.motif_budget_update && newState.repetition_registry.motif_budgets) {
      const budget = newState.repetition_registry.motif_budgets.find(
        b => b.motif === patch.motif_budget_update!.motif
      );
      if (budget && patch.motif_budget_update.absence_satisfied !== undefined) {
        budget.absence_window_satisfied = patch.motif_budget_update.absence_satisfied;
      }
    }

    return newState;
  }
}
