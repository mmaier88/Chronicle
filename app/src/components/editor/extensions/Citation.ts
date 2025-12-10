import { Mark, mergeAttributes } from '@tiptap/core'

export interface CitationOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    citation: {
      /**
       * Set a citation mark
       */
      setCitation: (attributes: { sourceId: string; pageNumber?: number }) => ReturnType
      /**
       * Toggle a citation mark
       */
      toggleCitation: (attributes: { sourceId: string; pageNumber?: number }) => ReturnType
      /**
       * Unset a citation mark
       */
      unsetCitation: () => ReturnType
    }
  }
}

export const Citation = Mark.create<CitationOptions>({
  name: 'citation',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      sourceId: {
        default: null,
        parseHTML: element => element.getAttribute('data-source-id'),
        renderHTML: attributes => {
          if (!attributes.sourceId) {
            return {}
          }
          return {
            'data-source-id': attributes.sourceId,
          }
        },
      },
      pageNumber: {
        default: null,
        parseHTML: element => element.getAttribute('data-page-number'),
        renderHTML: attributes => {
          if (!attributes.pageNumber) {
            return {}
          }
          return {
            'data-page-number': attributes.pageNumber,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-citation]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-citation': '',
        class: 'citation',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setCitation:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      toggleCitation:
        attributes =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes)
        },
      unsetCitation:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },
})
