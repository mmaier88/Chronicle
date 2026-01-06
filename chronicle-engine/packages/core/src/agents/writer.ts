import { z } from 'zod';
import { LLMClient, RequestContext } from '../llm/client.js';
import { WRITER_SYSTEM_PROMPT, generateWriterPrompt } from '../llm/prompts.js';
import { NarrativeState, STATE_CONSTANTS } from '../narrative/state.js';

/**
 * Writer output schema
 */
export const WriterOutputSchema = z.object({
  scene_title: z.string(),
  pov_character: z.string(),
  content: z.string(),
  word_count: z.number()
});

export type WriterOutput = z.infer<typeof WriterOutputSchema>;

/**
 * Writer Agent - generates raw scene content
 *
 * The Writer is creative and uninhibited. It does NOT worry about:
 * - Redundancy (that's Editor's job)
 * - Cutting content (that's Editor's job)
 * - Perfect prose (Editor will tighten)
 *
 * The Writer DOES:
 * - Follow the scene brief
 * - Honor genre conventions
 * - Write sensory, grounded prose
 * - Create tension and revelation
 */
export class WriterAgent {
  constructor(private llm: LLMClient) {}

  /**
   * Generate a raw scene
   */
  async generateScene(
    state: NarrativeState,
    sceneBrief: string,
    context: RequestContext,
    constraints?: string[]
  ): Promise<WriterOutput> {
    const userPrompt = generateWriterPrompt(state, sceneBrief, constraints);

    const response = await this.llm.generateText({
      systemPrompt: WRITER_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 6000, // Allow for up to 2500 words
      temperature: 0.85, // Creative temperature
      context
    });

    // Parse the response to extract metadata
    const content = response.content;
    const wordCount = content.split(/\s+/).length;

    // Try to extract title and POV from header
    const headerMatch = content.match(/\*\*Scene:\s*(.+?)\*\*/);
    const povMatch = content.match(/\*\*POV:\s*(.+?)\*\*/);

    const sceneTitle = headerMatch?.[1] || 'Untitled Scene';
    const povCharacter = povMatch?.[1] || Object.keys(state.characters)[0] || 'Unknown';

    // Validate word count
    if (wordCount < STATE_CONSTANTS.SCENE_RAW_WORDS_MIN) {
      throw new Error(`Scene too short: ${wordCount} words (minimum ${STATE_CONSTANTS.SCENE_RAW_WORDS_MIN})`);
    }

    return {
      scene_title: sceneTitle,
      pov_character: povCharacter,
      content,
      word_count: wordCount
    };
  }

  /**
   * Regenerate a scene with new constraints
   */
  async regenerateScene(
    state: NarrativeState,
    sceneBrief: string,
    context: RequestContext,
    constraints: string[],
    previousAttempt: string
  ): Promise<WriterOutput> {
    const augmentedConstraints = [
      ...constraints,
      `Your previous attempt was rejected. Here's what NOT to do:`,
      `Previous rejected text (first 500 chars): "${previousAttempt.slice(0, 500)}..."`,
      `Write something genuinely different this time.`
    ];

    return this.generateScene(state, sceneBrief, { ...context, attempt: (context.attempt || 0) + 1 }, augmentedConstraints);
  }
}
