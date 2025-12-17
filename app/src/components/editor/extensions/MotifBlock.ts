import { Node, mergeAttributes } from '@tiptap/core'

export interface MotifBlockAttributes {
  motifId: string
  label: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    motifBlock: {
      setMotifBlock: (attributes?: Partial<MotifBlockAttributes>) => ReturnType
      unsetMotifBlock: () => ReturnType
    }
  }
}

export const MotifBlock = Node.create({
  name: 'motifBlock',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      motifId: {
        default: null,
        parseHTML: element => element.getAttribute('data-motif-id'),
        renderHTML: attributes => ({
          'data-motif-id': attributes.motifId,
        }),
      },
      label: {
        default: '',
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => ({
          'data-label': attributes.label,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="motif-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'motif-block',
        class: 'motif-block',
        title: `Motif: ${node.attrs.label}`,
      }),
      `◆ ${node.attrs.label}`,
    ]
  },

  addCommands() {
    return {
      setMotifBlock:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          })
        },
      unsetMotifBlock:
        () =>
        ({ commands }) => {
          return commands.deleteSelection()
        },
    }
  },
})
