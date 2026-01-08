import { NextResponse } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'

// =============================================================================
// STANDARDIZED API RESPONSES
// =============================================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: unknown
  code?: string
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Create a successful API response
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Create an error API response
 */
export function apiError(
  message: string,
  status = 400,
  details?: unknown,
  code?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
  }
  if (details !== undefined) response.details = details
  if (code) response.code = code
  return NextResponse.json(response, { status })
}

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: () => apiError('Unauthorized', 401, undefined, 'UNAUTHORIZED'),
  forbidden: () => apiError('Forbidden', 403, undefined, 'FORBIDDEN'),
  notFound: (resource = 'Resource') => apiError(`${resource} not found`, 404, undefined, 'NOT_FOUND'),
  badRequest: (message: string, details?: unknown) => apiError(message, 400, details, 'BAD_REQUEST'),
  validation: (errors: z.ZodIssue[]) => apiError('Validation failed', 400, formatZodErrors(errors), 'VALIDATION_ERROR'),
  rateLimited: (message = 'Rate limit exceeded') => apiError(message, 429, undefined, 'RATE_LIMITED'),
  internal: (message = 'Internal server error') => apiError(message, 500, undefined, 'INTERNAL_ERROR'),
}

// =============================================================================
// ZOD VALIDATION HELPERS
// =============================================================================

/**
 * Format Zod errors into a user-friendly structure
 */
function formatZodErrors(errors: z.ZodIssue[]): Record<string, string[]> {
  const formatted: Record<string, string[]> = {}
  for (const error of errors) {
    const path = error.path.join('.') || '_root'
    if (!formatted[path]) formatted[path] = []
    formatted[path].push(error.message)
  }
  return formatted
}

/**
 * Validate request body against a Zod schema
 * Returns parsed data or throws a NextResponse error
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T | NextResponse<ApiErrorResponse>> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return ApiErrors.validation(result.error.issues)
    }

    return result.data
  } catch (error) {
    if (error instanceof SyntaxError) {
      return ApiErrors.badRequest('Invalid JSON in request body')
    }
    throw error
  }
}

/**
 * Type guard to check if validation returned an error response
 */
export function isApiError(value: unknown): value is NextResponse<ApiErrorResponse> {
  return value instanceof NextResponse
}

// =============================================================================
// COMMON ZOD SCHEMAS
// =============================================================================

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format')

// Book genre enum
export const bookGenreSchema = z.enum([
  'literary_fiction',
  'romance',
  'thriller',
  'fantasy',
  'sci_fi',
  'mystery',
  'horror',
  'historical',
  'non_fiction'
])

// Book length enum
export const bookLengthSchema = z.union([
  z.literal(30),
  z.literal(60),
  z.literal(120),
  z.literal(300)
])

// Generation mode enum
export const generationModeSchema = z.enum(['draft', 'polished'])

// Slider value (1-5 or 'auto')
export const sliderValueSchema = z.union([
  z.literal('auto'),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5)
])

// Full sliders object
export const storySlicersSchema = z.object({
  violence: sliderValueSchema,
  romance: sliderValueSchema,
  tone: sliderValueSchema,
  darkness: sliderValueSchema,
  emotionalIntensity: sliderValueSchema,
  languageComplexity: sliderValueSchema,
  plotComplexity: sliderValueSchema,
  pacing: sliderValueSchema,
  realism: sliderValueSchema,
  worldDetail: sliderValueSchema,
  characterDepth: sliderValueSchema,
  moralClarity: sliderValueSchema,
  shockValue: sliderValueSchema,
  explicitSafeguard: sliderValueSchema,
}).partial()

// Vibe preview warnings
export const warningsSchema = z.object({
  violence: z.enum(['none', 'low', 'medium', 'high']).optional(),
  romance: z.enum(['none', 'low', 'medium', 'high']).optional(),
  darkness: z.enum(['none', 'low', 'medium', 'high']).optional(),
})

// Character in preview
export const previewCharacterSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
})

// Vibe preview schema
export const vibePreviewSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  logline: z.string().min(1, 'Logline is required').max(500),
  blurb: z.string().optional(),
  setting: z.string().optional(),
  cast: z.array(previewCharacterSchema).optional(),
  themes: z.array(z.string()).optional(),
  warnings: warningsSchema.optional(),
})

// =============================================================================
// REQUEST SCHEMAS FOR SPECIFIC ENDPOINTS
// =============================================================================

// POST /api/create/job
export const createJobSchema = z.object({
  genre: bookGenreSchema,
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(2000),
  preview: vibePreviewSchema,
  length: bookLengthSchema.optional().default(30),
  mode: generationModeSchema.optional().default('draft'),
  sliders: storySlicersSchema.optional(),
})

// POST /api/create/preview
export const createPreviewSchema = z.object({
  genre: bookGenreSchema,
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(2000),
})

// POST /api/ai/polish
export const polishSchema = z.object({
  text: z.string().min(100, 'Text must be at least 100 characters'),
  mode: z.enum(['full', 'quick']).optional().default('quick'),
  characters: z.array(previewCharacterSchema).optional().default([]),
  bookId: uuidSchema.optional(),
})

// POST /api/ai/generate
export const aiGenerateSchema = z.object({
  bookId: uuidSchema,
  chapterId: uuidSchema.optional(),
  sectionId: uuidSchema.optional(),
  type: z.enum(['constitution', 'chapter', 'section']),
  field: z.string().optional(),
})

// POST /api/share/create
export const shareCreateSchema = z.object({
  bookId: uuidSchema,
})

// POST /api/cover/generate
export const coverGenerateSchema = z.object({
  bookId: uuidSchema,
  regenerate: z.boolean().optional().default(false),
})

// POST /api/embed
export const embedSchema = z.object({
  bookId: uuidSchema,
  milestoneId: uuidSchema,
  chunks: z.array(z.string().min(1)).min(1, 'At least one chunk is required'),
})

// POST /api/ai/consistency
export const consistencySchema = z.object({
  bookId: uuidSchema,
  chapterId: uuidSchema,
  text: z.string().min(1),
})

// POST /api/ai/extract
export const extractSchema = z.object({
  text: z.string().min(1),
  bookId: uuidSchema.optional(),
})

// POST /api/create/surprise
export const surpriseSchema = z.object({
  genre: bookGenreSchema.optional(),
})

// Export types inferred from schemas
export type CreateJobInput = z.infer<typeof createJobSchema>
export type CreatePreviewInput = z.infer<typeof createPreviewSchema>
export type PolishInput = z.infer<typeof polishSchema>
export type AiGenerateInput = z.infer<typeof aiGenerateSchema>
export type ShareCreateInput = z.infer<typeof shareCreateSchema>
export type CoverGenerateInput = z.infer<typeof coverGenerateSchema>
export type EmbedInput = z.infer<typeof embedSchema>
export type ConsistencyInput = z.infer<typeof consistencySchema>
export type ExtractInput = z.infer<typeof extractSchema>
export type SurpriseInput = z.infer<typeof surpriseSchema>
