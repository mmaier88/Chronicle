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

  // Character updates
  characters: z.record(z.string(), z.object({
    certainty_delta: z.number().optional(),
    transformation_delta: z.number().optional(),
    cost_added: z.string().optional(),
    irreversible_loss: z.boolean().optional()
  })).optional(),

  // Motifs added
  motifs_added: z.array(z.string()).optional(),

  // Summary update for this scene
  scene_summary: z.string().optional()
});

export type StatePatch = z.infer<typeof StatePatchSchema>;

/**
 * Editor output schema
 */
export const EditorOutputSchema = z.object({
  decision: z.enum(['ACCEPT', 'REWRITE', 'MERGE', 'REGENERATE', 'DROP']),
  fingerprint: SceneFingerprintSchema,
  edited_text: z.string().optional(),
  state_patch: StatePatchSchema.optional(),
  instructions: z.string().optional(),
  reason: z.string()
});

export type EditorOutput = z.infer<typeof EditorOutputSchema>;

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
  ): Promise<EditorOutput> {
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
   */
  applyStatePatch(state: NarrativeState, patch: StatePatch): NarrativeState {
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
            irreversible_loss: false
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
      }
    }

    // Add motifs
    if (patch.motifs_added) {
      for (const motif of patch.motifs_added) {
        if (!newState.repetition_registry.motifs.includes(motif)) {
          newState.repetition_registry.motifs.push(motif);
        }
      }
    }

    // Update scene summary
    if (patch.scene_summary) {
      newState.summaries.previous_scene = patch.scene_summary;
    }

    return newState;
  }
}
