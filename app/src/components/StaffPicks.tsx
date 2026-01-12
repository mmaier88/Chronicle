'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { StaffPick } from '@/app/api/staff-picks/route'

export function StaffPicks() {
  const [picks, setPicks] = useState<StaffPick[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPicks() {
      try {
        const res = await fetch('/api/staff-picks')
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        setPicks(data.staffPicks || [])
      } catch {
        setError('Unable to load staff picks')
      } finally {
        setLoading(false)
      }
    }
    fetchPicks()
  }, [])

  // Don't render if no picks or error
  if (error || (!loading && picks.length === 0)) {
    return null
  }

  return (
    <section className="staff-picks">
      <div className="staff-picks-inner">
        <div className="staff-picks-header">
          <span className="section-label">Staff Picks</span>
          <h2 className="section-headline">Stories we love</h2>
          <p className="section-body center">
            Handpicked tales that moved us, surprised us, or simply felt right for the moment.
          </p>
        </div>

        {loading ? (
          <div className="staff-picks-loading">
            <div className="loading-spinner" />
          </div>
        ) : (
          <div className="staff-picks-grid">
            {picks.map((pick) => (
              <Link
                key={pick.id}
                href={`/share/${pick.share_token}`}
                className="staff-pick-card"
              >
                <div className="staff-pick-cover">
                  {pick.cover_url ? (
                    <Image
                      src={pick.cover_url}
                      alt={pick.title}
                      fill
                      sizes="(max-width: 768px) 50vw, 200px"
                      className="staff-pick-image"
                    />
                  ) : (
                    <div className="staff-pick-placeholder" />
                  )}
                </div>
                <div className="staff-pick-info">
                  <h3 className="staff-pick-title">{pick.title}</h3>
                  {pick.core_question && (
                    <p className="staff-pick-question">{pick.core_question}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
