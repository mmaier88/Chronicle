import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  NarrativeState,
  SceneFingerprint,
  createInitialState,
  STATE_CONSTANTS,
  trimFingerprintWindow,
  generateSceneId,
  createLLMClient,
  LLMClient,
  WriterAgent,
  EditorAgent,
  ValidatorAgent,
  EditorDecision,
  PLANNER_SYSTEM_PROMPT,
  generateSceneBriefPrompt
} from '@chronicle/core';

/**
 * Generation mode
 */
export type GenerationMode = 'draft' | 'polished';

/**
 * Job input from API
 */
export interface BookJobInput {
  prompt: string;
  genre: string;
  target_length_words: number;
  voice?: string;
  mode?: GenerationMode;
}

/**
 * Progress callback for status updates
 */
export type ProgressCallback = (progress: number, message: string) => Promise<void>;

/**
 * Accepted scene metadata
 */
interface AcceptedScene {
  sceneId: string;
  title: string;
  pov: string;
  wordCount: number;
  fingerprint: SceneFingerprint;
}

/**
 * Chapter buffer
 */
interface ChapterBuffer {
  title: string;
  scenes: Array<{
    title: string;
    content: string;
    wordCount: number;
  }>;
  totalWords: number;
}

/**
 * Orchestrator - runs the complete book generation pipeline
 */
export class Orchestrator {
  private llm: LLMClient;
  private writer: WriterAgent;
  private editor: EditorAgent;
  private validator: ValidatorAgent;
  private mode: GenerationMode = 'draft';

  constructor(
    private prisma: PrismaClient,
    private jobId: string,
    private onProgress: ProgressCallback
  ) {
    this.llm = createLLMClient();
    this.writer = new WriterAgent(this.llm);
    this.editor = new EditorAgent(this.llm);
    this.validator = new ValidatorAgent(this.llm);
  }

  /**
   * Run the complete generation pipeline
   */
  async run(input: BookJobInput): Promise<string> {
    // Set generation mode (default to draft for speed)
    this.mode = input.mode || 'draft';
    const modeLabel = this.mode === 'draft' ? '⚡ Draft' : '✨ Polished';

    const context = { jobId: this.jobId, agent: 'planner' as const };

    // Phase 1: Initialize
    await this.onProgress(5, `Initializing narrative state... (${modeLabel} mode)`);

    const state = await this.initializeState(input);
    const actOutlines = await this.generateActOutlines(state);

    // Storage for the final book
    const chapters: ChapterBuffer[] = [];
    let currentChapter: ChapterBuffer = { title: 'Chapter 1', scenes: [], totalWords: 0 };
    let currentState = state;

    // Phase 2: Generate each act
    for (let actIndex = 1; actIndex <= state.structure.acts_total; actIndex++) {
      await this.onProgress(
        10 + Math.floor((actIndex - 1) / state.structure.acts_total * 70),
        `Writing Act ${actIndex}...`
      );

      currentState = this.initializeAct(currentState, actIndex, actOutlines[actIndex - 1]);

      // Generate scenes until act word target reached
      while (currentState.act_state.act_words_written < currentState.act_state.act_words_target) {
        const sceneId = generateSceneId(
          currentState.structure.act_index,
          currentState.structure.chapter_index,
          currentState.structure.scene_index
        );

        // Generate scene brief
        const sceneBrief = await this.generateSceneBrief(currentState, actOutlines[actIndex - 1]);

        // Writer generates raw scene
        let rawScene = await this.generateScene(currentState, sceneBrief, sceneId);

        let finalText = '';
        let shouldAddScene = true;

        if (this.mode === 'draft') {
          // DRAFT MODE: Skip editor, use raw scene directly (2x faster)
          finalText = rawScene.content;

        } else {
          // POLISHED MODE: Full editor evaluation loop
          let attempts = 0;
          let decision: EditorDecision = 'REGENERATE';
          let fingerprint: SceneFingerprint | null = null;

          while (decision !== 'ACCEPT' && attempts < STATE_CONSTANTS.MAX_SCENE_REGENERATIONS) {
            attempts++;

            const evaluation = await this.editor.evaluateScene(
              rawScene.content,
              sceneId,
              currentState,
              { jobId: this.jobId, sceneId, agent: 'editor' }
            );

            decision = evaluation.decision;
            fingerprint = evaluation.fingerprint;

            if (decision === 'ACCEPT') {
              finalText = evaluation.edited_text || rawScene.content;

              // Apply state patch
              if (evaluation.state_patch) {
                currentState = this.editor.applyStatePatch(currentState, evaluation.state_patch);
              }

              // Add fingerprint to registry
              currentState.repetition_registry.recent_fingerprints = trimFingerprintWindow([
                ...currentState.repetition_registry.recent_fingerprints,
                fingerprint
              ]);

            } else if (decision === 'REGENERATE' || decision === 'REWRITE') {
              // Regenerate with constraints
              rawScene = await this.writer.regenerateScene(
                currentState,
                sceneBrief,
                { jobId: this.jobId, sceneId, agent: 'writer', attempt: attempts },
                evaluation.instructions ? [evaluation.instructions] : [],
                rawScene.content
              );

            } else if (decision === 'DROP') {
              // Skip this scene entirely, move to next
              shouldAddScene = false;
              break;

            } else if (decision === 'MERGE') {
              // Merge with previous scene (simplified: just append)
              if (currentChapter.scenes.length > 0) {
                const lastScene = currentChapter.scenes[currentChapter.scenes.length - 1];
                lastScene.content += '\n\n' + rawScene.content;
                lastScene.wordCount += rawScene.word_count;
                currentChapter.totalWords += rawScene.word_count;
              }
              shouldAddScene = false;
              break;
            }
          }

          // If editor loop exhausted without accept, use raw scene as fallback
          if (!finalText && shouldAddScene) {
            finalText = rawScene.content;
          }
        }

        // Add scene to chapter
        if (shouldAddScene && finalText) {
          const wordCount = finalText.split(/\s+/).length;

          currentChapter.scenes.push({
            title: rawScene.scene_title,
            content: finalText,
            wordCount: wordCount
          });
          currentChapter.totalWords += wordCount;

          // Update state
          currentState.structure.words_written += wordCount;
          currentState.act_state.act_words_written += wordCount;
          currentState.structure.scene_index++;

          // Checkpoint
          await this.saveCheckpoint(currentState, sceneId);
        }

        // Check chapter boundary (every ~3000-4000 words)
        if (currentChapter.totalWords >= 3500) {
          chapters.push(currentChapter);
          currentState.structure.chapter_index++;
          currentState.structure.scene_index = 1;
          currentChapter = {
            title: `Chapter ${chapters.length + 1}`,
            scenes: [],
            totalWords: 0
          };
        }
      }

      // Validate act
      const actSummary = this.summarizeAct(currentState, chapters.slice(-3));
      const actValidation = await this.validator.validateAct(
        currentState,
        actSummary,
        { jobId: this.jobId, agent: 'validator' }
      );

      if (!actValidation.valid && actIndex < state.structure.acts_total) {
        console.log(`Act ${actIndex} validation failed:`, actValidation.issues);
        // In production, would regenerate tail of act here
      }

      // Update summaries for next act
      currentState.summaries.current_act = actSummary;
    }

    // Push final chapter if not empty
    if (currentChapter.scenes.length > 0) {
      chapters.push(currentChapter);
    }

    // Phase 3: Final validation
    await this.onProgress(85, 'Validating manuscript...');

    const bookSummary = this.summarizeBook(currentState, chapters);
    const bookValidation = await this.validator.validateBook(
      currentState,
      bookSummary,
      { jobId: this.jobId, agent: 'validator' }
    );

    if (!bookValidation.valid) {
      console.log('Book validation failed:', bookValidation.issues);
      // In production, would regenerate final portion
    }

    // Phase 4: Assemble manuscript
    await this.onProgress(95, 'Assembling final manuscript...');

    const manuscript = this.assembleManuscript(chapters, currentState);

    // Save manuscript
    const title = await this.generateTitle(currentState);
    const blurb = await this.generateBlurb(currentState);

    await this.prisma.manuscript.create({
      data: {
        id: this.jobId + '-manuscript',
        title,
        blurb,
        content: manuscript,
        stats: {
          word_count: currentState.structure.words_written,
          chapter_count: chapters.length,
          act_count: currentState.structure.acts_total
        },
        job: {
          connect: { id: this.jobId }
        }
      }
    });

    await this.onProgress(100, 'Complete!');

    return manuscript;
  }

  /**
   * Initialize NarrativeState from input
   */
  private async initializeState(input: BookJobInput): Promise<NarrativeState> {
    // Use LLM to derive theme thesis and protagonist
    const response = await this.llm.generateJSON({
      systemPrompt: 'You are a story analyst. Extract the core elements from a book prompt.',
      userPrompt: `Analyze this book prompt and extract:
1. theme_thesis: The central insight or argument the book will explore
2. protagonist_name: A fitting name for the main character

Prompt: "${input.prompt}"
Genre: ${input.genre}

Respond with JSON: { "theme_thesis": "...", "protagonist_name": "..." }`,
      schema: z.object({
        theme_thesis: z.string(),
        protagonist_name: z.string()
      }),
      context: { jobId: this.jobId, agent: 'planner' }
    });

    return createInitialState({
      prompt: input.prompt,
      genre: input.genre,
      target_length_words: input.target_length_words,
      theme_thesis: response.content.theme_thesis,
      protagonist_name: response.content.protagonist_name
    });
  }

  /**
   * Generate outlines for each act
   */
  private async generateActOutlines(state: NarrativeState): Promise<string[]> {
    const response = await this.llm.generateJSON({
      systemPrompt: 'You are a story architect. Create act outlines for a novel.',
      userPrompt: `Create ${state.structure.acts_total} act outlines for this book:

Theme: ${state.theme_thesis}
Genre: ${state.genre}
Target length: ${state.target_length_words} words

For each act, provide:
- Goal: What this act must accomplish
- Key beats: 3-5 major story beats
- Close condition: What must happen to end this act

Respond with JSON: { "acts": ["Act 1 outline...", "Act 2 outline...", ...] }`,
      schema: z.object({
        acts: z.array(z.string())
      }),
      context: { jobId: this.jobId, agent: 'planner' }
    });

    return response.content.acts;
  }

  /**
   * Initialize state for a new act
   */
  private initializeAct(state: NarrativeState, actIndex: number, actOutline: string): NarrativeState {
    const newState = structuredClone(state);
    newState.structure.act_index = actIndex;
    newState.structure.chapter_index = 1;
    newState.structure.scene_index = 1;

    // Parse act goal from outline (simplified)
    const goalMatch = actOutline.match(/Goal:\s*(.+?)(?:\n|$)/i);
    newState.act_state = {
      act_goal: goalMatch?.[1] || `Complete Act ${actIndex}`,
      act_open_questions: [],
      act_close_conditions: [`Act ${actIndex} reaches natural conclusion`],
      act_words_target: Math.floor(state.target_length_words / state.structure.acts_total),
      act_words_written: 0
    };

    return newState;
  }

  /**
   * Generate a scene brief
   */
  private async generateSceneBrief(state: NarrativeState, actOutline: string): Promise<string> {
    const userPrompt = generateSceneBriefPrompt(state, actOutline);

    const response = await this.llm.generateText({
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 500,
      temperature: 0.7,
      context: { jobId: this.jobId, agent: 'planner' }
    });

    return response.content;
  }

  /**
   * Generate a scene using Writer agent
   */
  private async generateScene(state: NarrativeState, sceneBrief: string, sceneId: string) {
    return this.writer.generateScene(
      state,
      sceneBrief,
      { jobId: this.jobId, sceneId, agent: 'writer' }
    );
  }

  /**
   * Save a checkpoint
   */
  private async saveCheckpoint(state: NarrativeState, phase: string): Promise<void> {
    await this.prisma.narrativeCheckpoint.create({
      data: {
        jobId: this.jobId,
        phase,
        narrativeState: state as any,
        acceptedScenes: state.repetition_registry.recent_fingerprints.map(fp => ({
          scene_id: fp.scene_id,
          function: fp.narrative_function,
          new_info: fp.new_information
        }))
      }
    });
  }

  /**
   * Summarize an act
   */
  private summarizeAct(state: NarrativeState, recentChapters: ChapterBuffer[]): string {
    const sceneTitles = recentChapters
      .flatMap(ch => ch.scenes.map(s => s.title))
      .join(', ');

    return `Act ${state.structure.act_index} of ${state.structure.acts_total}. ` +
      `Words: ${state.act_state.act_words_written}. ` +
      `Scenes: ${sceneTitles}. ` +
      `Goal: ${state.act_state.act_goal}. ` +
      `Open questions: ${state.unresolved_questions.slice(0, 3).join('; ')}.`;
  }

  /**
   * Summarize the complete book
   */
  private summarizeBook(state: NarrativeState, chapters: ChapterBuffer[]): string {
    const chapterSummaries = chapters.map((ch, i) =>
      `Ch${i + 1}: ${ch.scenes.map(s => s.title).join(', ')}`
    ).join('\n');

    const protagonistName = Object.keys(state.characters)[0];
    const protagonist = state.characters[protagonistName];

    return `Complete book summary:
Theme: ${state.theme_thesis}
Genre: ${state.genre}
Words: ${state.structure.words_written}
Chapters: ${chapters.length}
Acts: ${state.structure.acts_total}

Protagonist (${protagonistName}):
- Transformation: ${protagonist?.transformation || 0}
- Irreversible loss: ${protagonist?.irreversible_loss || false}
- Costs: ${protagonist?.costs_incurred.join(', ') || 'None'}

Chapter structure:
${chapterSummaries}

Unresolved questions: ${state.unresolved_questions.length}
Escalation budget remaining: ${state.escalation_budget.remaining}`;
  }

  /**
   * Assemble final manuscript from chapters
   */
  private assembleManuscript(chapters: ChapterBuffer[], state: NarrativeState): string {
    let manuscript = `# ${state.theme_thesis.split(' ').slice(0, 5).join(' ')}...\n\n`;
    manuscript += `*A ${state.genre} novel*\n\n---\n\n`;

    for (const chapter of chapters) {
      manuscript += `## ${chapter.title}\n\n`;

      for (const scene of chapter.scenes) {
        manuscript += scene.content + '\n\n';
      }

      manuscript += '---\n\n';
    }

    return manuscript;
  }

  /**
   * Generate a title for the book
   */
  private async generateTitle(state: NarrativeState): Promise<string> {
    const response = await this.llm.generateText({
      systemPrompt: 'You generate evocative book titles.',
      userPrompt: `Generate a title for this ${state.genre} novel.
Theme: ${state.theme_thesis}
Motifs: ${state.repetition_registry.motifs.join(', ')}

Respond with just the title, nothing else.`,
      maxTokens: 50,
      temperature: 0.8,
      context: { jobId: this.jobId, agent: 'planner' }
    });

    return response.content.trim().replace(/['"]/g, '');
  }

  /**
   * Generate a blurb for the book
   */
  private async generateBlurb(state: NarrativeState): Promise<string> {
    const protagonistName = Object.keys(state.characters)[0];

    const response = await this.llm.generateText({
      systemPrompt: 'You write compelling book blurbs.',
      userPrompt: `Write a 2-3 sentence blurb for this ${state.genre} novel.
Theme: ${state.theme_thesis}
Protagonist: ${protagonistName}

No spoilers. Create intrigue.`,
      maxTokens: 200,
      temperature: 0.7,
      context: { jobId: this.jobId, agent: 'planner' }
    });

    return response.content.trim();
  }
}
