/**
 * Database utility functions for safe Supabase operations
 *
 * Ensures all database operations properly check for errors
 * instead of silently failing.
 */

import { PostgrestError, PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js'
import { logger } from './logger'

/**
 * Custom error class for database operations
 */
export class DbError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details: string | null,
    public readonly hint: string | null
  ) {
    super(message)
    this.name = 'DbError'
  }

  static fromPostgrestError(error: PostgrestError): DbError {
    return new DbError(error.message, error.code, error.details, error.hint)
  }
}

/**
 * Assert that a Supabase query succeeded and return the data
 * Throws DbError if the query failed
 *
 * @example
 * const book = await assertDbSuccess(
 *   supabase.from('books').select('*').eq('id', bookId).single(),
 *   'Failed to fetch book'
 * )
 */
export async function assertDbSuccess<T>(
  query: PromiseLike<PostgrestSingleResponse<T>>,
  context?: string
): Promise<T>
export async function assertDbSuccess<T>(
  query: PromiseLike<PostgrestResponse<T>>,
  context?: string
): Promise<T[]>
export async function assertDbSuccess<T>(
  query: PromiseLike<PostgrestSingleResponse<T> | PostgrestResponse<T>>,
  context?: string
): Promise<T | T[]> {
  const result = await query

  if (result.error) {
    const errorContext = context || 'Database operation failed'
    logger.error(`${errorContext}: ${result.error.message}`, result.error, {
      code: result.error.code,
      details: result.error.details,
      hint: result.error.hint,
    })
    throw DbError.fromPostgrestError(result.error)
  }

  return result.data
}

/**
 * Check if a Supabase mutation succeeded
 * Returns true if successful, throws DbError if failed
 *
 * @example
 * await assertDbMutation(
 *   supabase.from('books').update({ title: 'New Title' }).eq('id', bookId),
 *   'Failed to update book'
 * )
 */
export async function assertDbMutation(
  query: PromiseLike<{ error: PostgrestError | null }>,
  context?: string
): Promise<void> {
  const result = await query

  if (result.error) {
    const errorContext = context || 'Database mutation failed'
    logger.error(`${errorContext}: ${result.error.message}`, result.error, {
      code: result.error.code,
      details: result.error.details,
      hint: result.error.hint,
    })
    throw DbError.fromPostgrestError(result.error)
  }
}

/**
 * Safely execute a database operation and return result with error
 * Does not throw - useful when you want to handle errors manually
 *
 * @example
 * const { data, error } = await safeDbQuery(
 *   supabase.from('books').select('*').eq('id', bookId).single()
 * )
 * if (error) {
 *   // Handle error
 * }
 */
export async function safeDbQuery<T>(
  query: PromiseLike<PostgrestSingleResponse<T> | PostgrestResponse<T>>
): Promise<{ data: T | T[] | null; error: DbError | null }> {
  const result = await query

  if (result.error) {
    return { data: null, error: DbError.fromPostgrestError(result.error) }
  }

  return { data: result.data, error: null }
}
