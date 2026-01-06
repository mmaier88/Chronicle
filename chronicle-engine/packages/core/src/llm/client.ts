import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/**
 * LLM Client configuration
 */
export interface LLMClientConfig {
  provider: 'anthropic';
  apiKey: string;
  model?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Request context for logging and tracing
 */
export interface RequestContext {
  jobId: string;
  sceneId?: string;
  agent: 'writer' | 'editor' | 'validator' | 'fingerprint' | 'planner';
  attempt?: number;
}

/**
 * LLM request options
 */
export interface LLMRequestOptions<T extends z.ZodType> {
  systemPrompt: string;
  userPrompt: string;
  schema?: T;
  maxTokens?: number;
  temperature?: number;
  context: RequestContext;
}

/**
 * LLM response
 */
export interface LLMResponse<T> {
  content: T;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  durationMs: number;
}

/**
 * Logger interface
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Default console logger
 */
const defaultLogger: Logger = {
  info: (msg, meta) => console.log(JSON.stringify({ level: 'info', message: msg, ...meta, timestamp: new Date().toISOString() })),
  warn: (msg, meta) => console.warn(JSON.stringify({ level: 'warn', message: msg, ...meta, timestamp: new Date().toISOString() })),
  error: (msg, meta) => console.error(JSON.stringify({ level: 'error', message: msg, ...meta, timestamp: new Date().toISOString() }))
};

/**
 * LLM Client - provider-agnostic wrapper for LLM calls
 */
export class LLMClient {
  private anthropic: Anthropic;
  private model: string;
  private maxRetries: number;
  private logger: Logger;

  constructor(config: LLMClientConfig, logger: Logger = defaultLogger) {
    this.anthropic = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxRetries = config.maxRetries || 3;
    this.logger = logger;
  }

  /**
   * Generate text content (for Writer agent)
   */
  async generateText(options: Omit<LLMRequestOptions<z.ZodString>, 'schema'>): Promise<LLMResponse<string>> {
    const startTime = Date.now();

    this.logger.info('LLM request started', {
      jobId: options.context.jobId,
      sceneId: options.context.sceneId,
      agent: options.context.agent,
      type: 'text'
    });

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.8,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userPrompt }]
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const content = textBlock ? textBlock.text : '';

    const durationMs = Date.now() - startTime;

    this.logger.info('LLM request completed', {
      jobId: options.context.jobId,
      sceneId: options.context.sceneId,
      agent: options.context.agent,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      durationMs
    });

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      },
      durationMs
    };
  }

  /**
   * Generate structured JSON output with Zod validation
   */
  async generateJSON<T extends z.ZodType>(
    options: LLMRequestOptions<T>
  ): Promise<LLMResponse<z.infer<T>>> {
    const startTime = Date.now();

    this.logger.info('LLM JSON request started', {
      jobId: options.context.jobId,
      sceneId: options.context.sceneId,
      agent: options.context.agent
    });

    let lastError: Error | null = null;
    let lastRawOutput: string | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const systemWithJSON = `${options.systemPrompt}

CRITICAL: You must respond with valid JSON only. No markdown code blocks, no explanatory text.
Your entire response must be a single valid JSON object that matches the required schema.`;

        const response = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.3,
          system: systemWithJSON,
          messages: [{ role: 'user', content: options.userPrompt }]
        });

        const textBlock = response.content.find(b => b.type === 'text');
        const rawOutput = textBlock ? textBlock.text.trim() : '';
        lastRawOutput = rawOutput;

        // Try to parse JSON
        let parsed: unknown;
        try {
          // Handle potential markdown code blocks
          let jsonStr = rawOutput;
          if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }
          parsed = JSON.parse(jsonStr);
        } catch {
          throw new Error(`Invalid JSON: ${rawOutput.slice(0, 200)}...`);
        }

        // Validate with Zod
        const validated = options.schema!.parse(parsed);

        const durationMs = Date.now() - startTime;

        this.logger.info('LLM JSON request completed', {
          jobId: options.context.jobId,
          sceneId: options.context.sceneId,
          agent: options.context.agent,
          attempt,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          durationMs
        });

        return {
          content: validated,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens
          },
          durationMs
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.warn('LLM JSON request failed, retrying', {
          jobId: options.context.jobId,
          sceneId: options.context.sceneId,
          agent: options.context.agent,
          attempt,
          error: lastError.message
        });

        // If not last attempt, try repair prompt
        if (attempt < this.maxRetries && lastRawOutput) {
          const repairPrompt = `Your previous response was invalid JSON or didn't match the schema.

Previous response:
${lastRawOutput.slice(0, 1000)}

Error: ${lastError.message}

Please provide a corrected JSON response that:
1. Is valid JSON (no markdown, no explanatory text)
2. Matches the required schema exactly

${options.userPrompt}`;

          options = { ...options, userPrompt: repairPrompt };
        }
      }
    }

    this.logger.error('LLM JSON request failed after all retries', {
      jobId: options.context.jobId,
      sceneId: options.context.sceneId,
      agent: options.context.agent,
      error: lastError?.message,
      lastRawOutput: lastRawOutput?.slice(0, 500)
    });

    throw lastError;
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }
}

/**
 * Create LLM client from environment
 */
export function createLLMClient(logger?: Logger): LLMClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return new LLMClient(
    {
      provider: 'anthropic',
      apiKey,
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
    },
    logger
  );
}
