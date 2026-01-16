'use client'

import { useState } from 'react'
import { Book } from '@/types/chronicle'
import { ConstitutionEditor } from './ConstitutionEditor'
import { BackcoverEditor } from './BackcoverEditor'

type Tab = 'backcover' | 'constitution'

interface BookEditTabsProps {
  book: Book
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'backcover', label: 'Backcover' },
  { id: 'constitution', label: 'Constitution' },
]

export function BookEditTabs({ book }: BookEditTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('backcover')

  return (
    <div>
      {/* Tab navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid rgba(250, 246, 237, 0.1)',
        marginBottom: '1.5rem',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === tab.id ? 'var(--amber-warm)' : 'var(--moon-soft)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: '0.9375rem',
              borderBottom: activeTab === tab.id ? '2px solid var(--amber-warm)' : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'backcover' && (
          <BackcoverEditor bookId={book.id} />
        )}

        {activeTab === 'constitution' && (
          <ConstitutionEditor book={book} />
        )}
      </div>
    </div>
  )
}
