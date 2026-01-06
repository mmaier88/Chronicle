import { z } from 'zod';
import { LLMClient, RequestContext } from '../llm/client.js';
import { VALIDATOR_SYSTEM_PROMPT, generateActValidatorPrompt, generateBookValidatorPrompt } from '../llm/prompts.js';
import { NarrativeState } from '../narrative/state.js';

/**
 * Act validation result schema
 */
export const ActValidationResultSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string()),
  regeneration_scope: z.enum(['last_15_percent', 'last_chapter']).nullable(),
  regeneration_constraints: z.array(z.string())
});

export type ActValidationResult = z.infer<typeof ActValidationResultSchema>;

/**
 * Book validation result schema
 */
export const BookValidationResultSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string()),
  regeneration_scope: z.enum(['final_act_tail', 'final_chapter']).nullable(),
  regeneration_constraints: z.array(z.string()),
  quality_score: z.number().min(0).max(100),
  notes: z.string()
});

export type BookValidationResult = z.infer<typeof BookValidationResultSchema>;

/**
 * Validator Agent - validates structural integrity
 *
 * The Validator runs at:
 * 1. End of each act - checks act goals, closure conditions
 * 2. End of book - checks protagonist arc, escalation, ending
 *
 * If validation fails, it provides regeneration instructions.
 */
export class ValidatorAgent {
  constructor(private llm: LLMClient) {}

  /**
   * Validate an act
   */
  async validateAct(
    state: NarrativeState,
    actSummary: string,
    context: RequestContext
  ): Promise<ActValidationResult> {
    const userPrompt = generateActValidatorPrompt(state, actSummary);

    const response = await this.llm.generateJSON({
      systemPrompt: VALIDATOR_SYSTEM_PROMPT,
      userPrompt,
      schema: ActValidationResultSchema,
      temperature: 0.2, // Low temperature for consistent validation
      context
    });

    return response.content;
  }

  /**
   * Validate the completed book
   */
  async validateBook(
    state: NarrativeState,
    bookSummary: string,
    context: RequestContext
  ): Promise<BookValidationResult> {
    const userPrompt = generateBookValidatorPrompt(state, bookSummary);

    const response = await this.llm.generateJSON({
      systemPrompt: VALIDATOR_SYSTEM_PROMPT,
      userPrompt,
      schema: BookValidationResultSchema,
      temperature: 0.2,
      context
    });

    return response.content;
  }

  /**
   * Quick structural checks (run without LLM for speed)
   */
  quickStructuralCheck(state: NarrativeState): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check protagonist has arc
    const protagonistName = Object.keys(state.characters)[0];
    const protagonist = state.characters[protagonistName];

    if (!protagonist) {
      issues.push('No protagonist character tracked');
    } else {
      // By end of book
      if (state.structure.act_index === state.structure.acts_total) {
        if (!protagonist.irreversible_loss) {
          issues.push('Protagonist has not suffered irreversible loss');
        }
        if (protagonist.transformation < 0.3) {
          issues.push(`Protagonist transformation too low (${protagonist.transformation.toFixed(2)})`);
        }
        if (protagonist.costs_incurred.length === 0) {
          issues.push('Protagonist has incurred no costs');
        }
      }

      // By mid-book
      if (state.structure.act_index >= Math.floor(state.structure.acts_total / 2)) {
        if (protagonist.costs_incurred.length === 0) {
          issues.push('Protagonist should have incurred at least one cost by mid-book');
        }
      }
    }

    // Check escalation budget
    if (state.structure.act_index === state.structure.acts_total) {
      if (state.escalation_budget.remaining > 2) {
        issues.push(`Escalation budget not spent (${state.escalation_budget.remaining} remaining)`);
      }
    }

    // Check word count
    const minWords = state.target_length_words * 0.9;
    if (state.structure.act_index === state.structure.acts_total) {
      if (state.structure.words_written < minWords) {
        issues.push(`Word count below minimum (${state.structure.words_written}/${minWords})`);
      }
    }

    // Check unresolved questions
    if (state.structure.act_index === state.structure.acts_total) {
      if (state.unresolved_questions.length > 3) {
        issues.push(`Too many unresolved questions (${state.unresolved_questions.length})`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
