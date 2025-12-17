import { Node, mergeAttributes } from '@tiptap/core'

export interface NoteBlockAttributes {
  noteType: 'todo' | 'research' | 'idea' | 'question'
  collapsed: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteBlock: {
      setNoteBlock: (attributes?: Partial<NoteBlockAttributes>) => ReturnType
      toggleNoteCollapsed: () => ReturnType
      unsetNoteBlock: () => ReturnType
    }
  }
}

// NoteBlock is special: it's NEVER embedded
// It's a scratchpad for the author that doesn't become part of the book
export const NoteBlock = Node.create({
  name: 'noteBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      noteType: {
        default: 'idea',
        parseHTML: element => element.getAttribute('data-note-type'),
        renderHTML: attributes => ({
          'data-note-type': attributes.noteType,
        }),
      },
      collapsed: {
        default: false,
        parseHTML: element => element.getAttribute('data-collapsed') === 'true',
        renderHTML: attributes => ({
          'data-collapsed': attributes.collapsed ? 'true' : 'false',
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'aside[data-type="note-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const typeEmoji = {
      todo: '☐',
      research: '🔍',
      idea: '💭',
      question: '❓',
    }[HTMLAttributes['data-note-type'] as string] || '💭'

    return [
      'aside',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'note-block',
        class: `note-block note-${HTMLAttributes['data-note-type']} ${HTMLAttributes['data-collapsed'] === 'true' ? 'collapsed' : ''}`,
      }),
      [
        'div',
        { class: 'note-header' },
        ['span', { class: 'note-type-indicator' }, `${typeEmoji} Note`],
        ['span', { class: 'note-badge' }, 'Not embedded'],
      ],
      ['div', { class: 'note-content' }, 0],
    ]
  },

  addCommands() {
    return {
      setNoteBlock:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes)
        },
      toggleNoteCollapsed:
        () =>
        ({ tr, state }) => {
          const { selection } = state
          const node = state.doc.nodeAt(selection.from)
          if (node?.type.name === 'noteBlock') {
            tr.setNodeMarkup(selection.from, undefined, {
              ...node.attrs,
              collapsed: !node.attrs.collapsed,
            })
            return true
          }
          return false
        },
      unsetNoteBlock:
        () =>
        ({ commands }) => {
          return commands.lift(this.name)
        },
    }
  },
})
