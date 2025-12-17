import { Node, mergeAttributes } from '@tiptap/core'

export interface ClaimBlockAttributes {
  claimType: 'assertion' | 'definition' | 'premise' | 'inference' | 'counterclaim'
  stance: 'pro' | 'con' | 'neutral'
  confidence: number
  canonical: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    claimBlock: {
      setClaimBlock: (attributes?: Partial<ClaimBlockAttributes>) => ReturnType
      toggleClaimBlock: (attributes?: Partial<ClaimBlockAttributes>) => ReturnType
      unsetClaimBlock: () => ReturnType
    }
  }
}

export const ClaimBlock = Node.create({
  name: 'claimBlock',

  group: 'block',

  content: 'inline*',

  defining: true,

  addAttributes() {
    return {
      claimType: {
        default: 'assertion',
        parseHTML: element => element.getAttribute('data-claim-type'),
        renderHTML: attributes => ({
          'data-claim-type': attributes.claimType,
        }),
      },
      stance: {
        default: 'neutral',
        parseHTML: element => element.getAttribute('data-stance'),
        renderHTML: attributes => ({
          'data-stance': attributes.stance,
        }),
      },
      confidence: {
        default: 0.8,
        parseHTML: element => parseFloat(element.getAttribute('data-confidence') || '0.8'),
        renderHTML: attributes => ({
          'data-confidence': attributes.confidence,
        }),
      },
      canonical: {
        default: false,
        parseHTML: element => element.getAttribute('data-canonical') === 'true',
        renderHTML: attributes => ({
          'data-canonical': attributes.canonical ? 'true' : 'false',
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="claim-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'claim-block',
        class: `claim-block claim-${HTMLAttributes['data-stance']} ${HTMLAttributes['data-canonical'] === 'true' ? 'canonical' : 'draft'}`,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setClaimBlock:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes)
        },
      toggleClaimBlock:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attributes)
        },
      unsetClaimBlock:
        () =>
        ({ commands }) => {
          return commands.lift(this.name)
        },
    }
  },
})
