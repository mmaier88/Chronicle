'use client'

import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react'

export interface CommandItem {
  title: string
  description: string
  icon: string
  action: string
}

const SLASH_COMMANDS: CommandItem[] = [
  {
    title: 'Summarize',
    description: 'Condense the selected text',
    icon: '📝',
    action: 'summarize'
  },
  {
    title: 'Rewrite',
    description: 'Improve clarity and flow',
    icon: '✏️',
    action: 'rewrite'
  },
  {
    title: 'Expand',
    description: 'Add more detail and depth',
    icon: '📖',
    action: 'expand'
  },
  {
    title: 'Shorten',
    description: 'Make it more concise',
    icon: '✂️',
    action: 'shorten'
  },
  {
    title: 'Define',
    description: 'Explain key terms',
    icon: '📚',
    action: 'define'
  },
  {
    title: 'Humanize',
    description: 'Make it sound natural',
    icon: '👤',
    action: 'humanize'
  },
  {
    title: 'Continue',
    description: 'Continue writing from here',
    icon: '➡️',
    action: 'continue'
  }
]

interface CommandListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

interface CommandListProps {
  items: CommandItem[]
  command: (item: CommandItem) => void
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = useCallback((index: number) => {
      const item = items[index]
      if (item) {
        command(item)
      }
    }, [items, command])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length)
          return true
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % items.length)
          return true
        }

        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }

        return false
      }
    }), [selectedIndex, items.length, selectItem])

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    if (items.length === 0) {
      return null
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[200px]">
        <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
          AI Commands
        </div>
        {items.map((item, index) => (
          <button
            key={item.action}
            onClick={() => selectItem(index)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              index === selectedIndex
                ? 'bg-blue-50 dark:bg-blue-900/30'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {item.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }
)

CommandList.displayName = 'CommandList'

export interface SlashCommandOptions {
  onCommand: (action: string, text: string) => void
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      onCommand: () => {}
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        command: ({ editor, range, props }) => {
          // Delete the slash command
          editor.chain().focus().deleteRange(range).run()

          // Get selected text or current paragraph
          const { from, to } = editor.state.selection
          let text = ''

          if (from !== to) {
            // There's a selection
            text = editor.state.doc.textBetween(from, to, ' ')
          } else {
            // Get current paragraph/block content
            const $pos = editor.state.doc.resolve(from)
            const start = $pos.start()
            const end = $pos.end()
            text = editor.state.doc.textBetween(start, end, ' ')
          }

          // Call the onCommand handler with the action and text
          this.options.onCommand((props as CommandItem).action, text)
        },
        items: ({ query }) => {
          return SLASH_COMMANDS.filter(item =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.action.toLowerCase().includes(query.toLowerCase())
          )
        },
        render: () => {
          let component: ReactRenderer<CommandListRef> | null = null
          let popup: TippyInstance[] | null = null

          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor
              })

              if (!props.clientRect) {
                return
              }

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start'
              })
            },

            onUpdate: (props: SuggestionProps) => {
              component?.updateProps(props)

              if (!props.clientRect) {
                return
              }

              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect
              })
            },

            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide()
                return true
              }

              return component?.ref?.onKeyDown(props) || false
            },

            onExit: () => {
              popup?.[0]?.destroy()
              component?.destroy()
            }
          }
        }
      })
    ]
  }
})
