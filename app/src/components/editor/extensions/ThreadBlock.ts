import { Node, mergeAttributes } from '@tiptap/core'

export interface ThreadBlockAttributes {
  threadId: string
  status: 'open' | 'hinted' | 'resolved'
  description: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    threadBlock: {
      setThreadBlock: (attributes?: Partial<ThreadBlockAttributes>) => ReturnType
      updateThreadStatus: (threadId: string, status: 'open' | 'hinted' | 'resolved') => ReturnType
      unsetThreadBlock: () => ReturnType
    }
  }
}

export const ThreadBlock = Node.create({
  name: 'threadBlock',

  group: 'block',

  content: 'inline*',

  defining: true,

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: element => element.getAttribute('data-thread-id'),
        renderHTML: attributes => ({
          'data-thread-id': attributes.threadId,
        }),
      },
      status: {
        default: 'open',
        parseHTML: element => element.getAttribute('data-status'),
        renderHTML: attributes => ({
          'data-status': attributes.status,
        }),
      },
      description: {
        default: '',
        parseHTML: element => element.getAttribute('data-description'),
        renderHTML: attributes => ({
          'data-description': attributes.description,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="thread-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const statusEmoji = {
      open: '🔓',
      hinted: '💡',
      resolved: '✓',
    }[HTMLAttributes['data-status'] as string] || '🔓'

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'thread-block',
        class: `thread-block thread-${HTMLAttributes['data-status']}`,
      }),
      ['span', { class: 'thread-indicator' }, statusEmoji],
      ['div', { class: 'thread-content' }, 0],
    ]
  },

  addCommands() {
    return {
      setThreadBlock:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, {
            threadId: attributes.threadId || `thread-${Date.now()}`,
            ...attributes,
          })
        },
      updateThreadStatus:
        (threadId, status) =>
        ({ tr, state }) => {
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'threadBlock' && node.attrs.threadId === threadId) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, status })
            }
          })
          return true
        },
      unsetThreadBlock:
        () =>
        ({ commands }) => {
          return commands.lift(this.name)
        },
    }
  },
})
