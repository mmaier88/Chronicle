/**
 * Structured logging utility for Chronicle
 *
 * Features:
 * - Correlation IDs for request tracing
 * - Structured JSON output for log aggregators
 * - Context propagation (userId, bookId, jobId, etc.)
 *
 * In production, these should be sent to a monitoring service like Sentry, Datadog, etc.
 * For now, we use structured console output that can be parsed by log aggregators.
 */

import { headers } from 'next/headers'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  correlationId?: string
  userId?: string
  bookId?: string
  jobId?: string
  operation?: string
  durationMs?: number
  [key: string]: unknown
}

// Generate a unique correlation ID
export function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

// Get correlation ID from request headers or generate a new one
export async function getCorrelationId(): Promise<string> {
  try {
    const headersList = await headers()
    return headersList.get('x-correlation-id') || generateCorrelationId()
  } catch {
    // Not in a request context
    return generateCorrelationId()
  }
}

function formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    }),
  }

  return JSON.stringify(logEntry)
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLog('debug', message, context))
    }
  },

  info(message: string, context?: LogContext) {
    console.log(formatLog('info', message, context))
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatLog('warn', message, context))
  },

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error(formatLog('error', message, context, err))
  },
}

export default logger
