/**
 * Typed API Client
 *
 * Provides type-safe fetch wrappers for all API endpoints.
 * Ensures frontend and backend agree on request/response shapes at compile time.
 *
 * Usage:
 *   const { data, error } = await api.create.preview({ genre: 'literary_fiction', prompt: '...' })
 *   if (error) { handleError(error) }
 *   else { usePreview(data.preview) }
 */

import type { VibePreview, BookGenre, StorySliders } from '@/types/chronicle'

// =============================================================================
// RESPONSE TYPES (match api-utils.ts)
// =============================================================================

export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: unknown
  code?: string
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// =============================================================================
// REQUEST/RESPONSE TYPES FOR EACH ENDPOINT
// =============================================================================

// POST /api/create/preview
export interface CreatePreviewRequest {
  genre: BookGenre
  prompt: string
}

export interface CreatePreviewResponse {
  preview: VibePreview
}

// POST /api/create/job
export interface CreateJobRequest {
  genre: BookGenre
  prompt: string
  preview: VibePreview
  length?: 30 | 60 | 120 | 300
  mode?: 'draft' | 'polished'
  sliders?: Partial<StorySliders>
}

export interface CreateJobResponse {
  job_id: string
  book_id: string
}

// GET /api/create/job/[id]/status
export interface JobStatusResponse {
  status: 'pending' | 'running' | 'completed' | 'failed'
  phase?: string
  progress?: number
  error?: string
  book_id?: string
}

// POST /api/create/surprise
export interface SurpriseRequest {
  genre?: BookGenre
}

export interface SurpriseResponse {
  prompt: string
}

// POST /api/share/create
export interface ShareCreateRequest {
  bookId: string
}

export interface ShareCreateResponse {
  token: string
  share_url: string
  expires_at: string
}

// POST /api/cover/generate
export interface CoverGenerateRequest {
  bookId: string
  regenerate?: boolean
}

export interface CoverGenerateResponse {
  status: 'ready' | 'generating' | 'failed'
  cover_url?: string
  message?: string
}

// =============================================================================
// API CLIENT
// =============================================================================

type FetchResult<T> =
  | { data: T; error: null }
  | { data: null; error: string; details?: unknown; code?: string }

async function apiFetch<TRequest, TResponse>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: TRequest
): Promise<FetchResult<TResponse>> {
  try {
    const options: RequestInit = {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }

    const response = await fetch(url, options)
    const result = await response.json() as ApiResponse<TResponse>

    if (!response.ok || !result.success) {
      const errorResponse = result as ApiErrorResponse
      return {
        data: null,
        error: errorResponse.error || 'Request failed',
        details: errorResponse.details,
        code: errorResponse.code,
      }
    }

    return { data: result.data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

/**
 * Typed API client for Chronicle endpoints
 */
export const api = {
  create: {
    /**
     * Generate a book preview from a prompt
     */
    preview: (req: CreatePreviewRequest) =>
      apiFetch<CreatePreviewRequest, CreatePreviewResponse>('/api/create/preview', 'POST', req),

    /**
     * Start a book generation job
     */
    job: (req: CreateJobRequest) =>
      apiFetch<CreateJobRequest, CreateJobResponse>('/api/create/job', 'POST', req),

    /**
     * Get job status
     */
    jobStatus: (jobId: string) =>
      apiFetch<never, JobStatusResponse>(`/api/create/job/${jobId}/status`, 'GET'),

    /**
     * Generate a random story prompt
     */
    surprise: (req?: SurpriseRequest) =>
      apiFetch<SurpriseRequest | undefined, SurpriseResponse>('/api/create/surprise', 'POST', req),
  },

  share: {
    /**
     * Create a share link for a book
     */
    create: (req: ShareCreateRequest) =>
      apiFetch<ShareCreateRequest, ShareCreateResponse>('/api/share/create', 'POST', req),
  },

  cover: {
    /**
     * Generate or regenerate a book cover
     */
    generate: (req: CoverGenerateRequest) =>
      apiFetch<CoverGenerateRequest, CoverGenerateResponse>('/api/cover/generate', 'POST', req),
  },
}

// Export types for use in components
export type { VibePreview, BookGenre, StorySliders }
