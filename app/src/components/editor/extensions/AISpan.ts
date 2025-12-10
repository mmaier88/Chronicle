import { Mark, mergeAttributes } from '@tiptap/core'

export interface AISpanOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiSpan: {
      /**
       * Set an AI-generated span mark
       */
      setAISpan: (attributes: { jobId: string; model?: string; action?: string }) => ReturnType
      /**
       * Toggle an AI-generated span mark
       */
      toggleAISpan: (attributes: { jobId: string; model?: string; action?: string }) => ReturnType
      /**
       * Unset an AI-generated span mark (humanize)
       */
      unsetAISpan: () => ReturnType
    }
  }
}

export const AISpan = Mark.create<AISpanOptions>({
  name: 'aiSpan',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      jobId: {
        default: null,
        parseHTML: element => element.getAttribute('data-ai-job-id'),
        renderHTML: attributes => {
          if (!attributes.jobId) {
            return {}
          }
          return {
            'data-ai-job-id': attributes.jobId,
          }
        },
      },
      model: {
        default: 'claude',
        parseHTML: element => element.getAttribute('data-ai-model'),
        renderHTML: attributes => {
          if (!attributes.model) {
            return {}
          }
          return {
            'data-ai-model': attributes.model,
          }
        },
      },
      action: {
        default: null,
        parseHTML: element => element.getAttribute('data-ai-action'),
        renderHTML: attributes => {
          if (!attributes.action) {
            return {}
          }
          return {
            'data-ai-action': attributes.action,
          }
        },
      },
      timestamp: {
        default: () => new Date().toISOString(),
        parseHTML: element => element.getAttribute('data-ai-timestamp'),
        renderHTML: attributes => {
          if (!attributes.timestamp) {
            return {}
          }
          return {
            'data-ai-timestamp': attributes.timestamp,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-ai-generated]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-ai-generated': '',
        class: 'ai-generated',
        title: 'AI-generated content',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setAISpan:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      toggleAISpan:
        attributes =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes)
        },
      unsetAISpan:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },
})
