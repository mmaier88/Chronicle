/**
 * AI Model Pricing (per 1M tokens)
 * Updated: 2026-01-09
 *
 * Prices are in USD per million tokens.
 * Source: https://www.anthropic.com/pricing
 */

export interface ModelPricing {
  input: number  // $ per 1M input tokens
  output: number // $ per 1M output tokens
}

// Anthropic model pricing (per 1M tokens)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude 3.5 Haiku
  'claude-3-5-haiku-20241022': { input: 1.00, output: 5.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },

  // Claude 3.5 Sonnet
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-sonnet-20240620': { input: 3.00, output: 15.00 },

  // Claude 3 Opus
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },

  // Default fallback
  'default': { input: 3.00, output: 15.00 },
}

/**
 * Calculate cost for a single API call
 */
export function calculateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[modelName] || MODEL_PRICING['default']

  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output

  return inputCost + outputCost
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(3)}¢`
  }
  return `$${cost.toFixed(4)}`
}

/**
 * Calculate total cost from an array of AI job records
 */
export function calculateTotalCost(
  jobs: Array<{
    model_name: string
    input_tokens: number | null
    output_tokens: number | null
  }>
): number {
  return jobs.reduce((total, job) => {
    if (job.input_tokens && job.output_tokens) {
      return total + calculateCost(job.model_name, job.input_tokens, job.output_tokens)
    }
    return total
  }, 0)
}
