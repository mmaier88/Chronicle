/**
 * Client-side debug utility
 *
 * Only logs in development mode. Silent in production.
 * Use this for client components instead of console.log.
 */

const isDev = process.env.NODE_ENV === 'development'

type DebugNamespace = 'audio' | 'pwa' | 'native' | 'ui' | 'general'

function createDebugger(namespace: DebugNamespace) {
  const prefix = `[${namespace.toUpperCase()}]`

  return {
    log(...args: unknown[]) {
      if (isDev) {
        console.log(prefix, ...args)
      }
    },
    warn(...args: unknown[]) {
      if (isDev) {
        console.warn(prefix, ...args)
      }
    },
    error(...args: unknown[]) {
      // Always log errors, even in production
      console.error(prefix, ...args)
    },
  }
}

// Pre-configured debuggers for common namespaces
export const debug = {
  audio: createDebugger('audio'),
  pwa: createDebugger('pwa'),
  native: createDebugger('native'),
  ui: createDebugger('ui'),
  general: createDebugger('general'),
}

export default debug
