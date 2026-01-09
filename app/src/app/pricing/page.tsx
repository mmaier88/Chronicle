import Link from 'next/link'
import { Check, Zap, Crown, Sparkles, ArrowRight } from 'lucide-react'
import { PRICING, formatPrice, LENGTH_LABELS, EDITION_INFO, BookLength } from '@/lib/stripe/pricing'

export const metadata = {
  title: 'Pricing - Chronicle',
  description: 'Simple, transparent pricing. Pay once per story. No subscriptions.',
}

export default function PricingPage() {
  const lengths: BookLength[] = [30, 60, 120, 300]

  return (
    <div className="app-container" style={{ minHeight: '100vh', background: 'var(--night-deep)' }}>
      {/* Header */}
      <header style={{
        padding: '1.5rem',
        borderBottom: '1px solid rgba(250, 246, 237, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--moon-light)',
            textDecoration: 'none'
          }}
        >
          <Sparkles style={{ width: 20, height: 20, color: 'var(--amber-warm)' }} />
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem', fontWeight: 500 }}>
            Chronicle
          </span>
        </Link>
        <Link
          href="/create/new"
          className="app-button-secondary"
          style={{ textDecoration: 'none' }}
        >
          Start creating
        </Link>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '4rem 1.5rem' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 className="app-heading-1" style={{ marginBottom: '1rem' }}>
            Simple, transparent pricing
          </h1>
          <p className="app-body" style={{ maxWidth: 500, margin: '0 auto', opacity: 0.7 }}>
            Pay once per story. No subscriptions. Your book, forever yours.
          </p>
        </div>

        {/* Edition Comparison */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          marginBottom: '4rem'
        }}>
          {/* Standard Edition */}
          <div className="app-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: 48,
                height: 48,
                background: 'rgba(212, 165, 116, 0.15)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap style={{ width: 24, height: 24, color: 'var(--amber-warm)' }} />
              </div>
              <div>
                <h2 className="app-heading-3" style={{ marginBottom: '0.25rem' }}>
                  {EDITION_INFO.standard.name} Edition
                </h2>
                <p className="app-body-sm" style={{ opacity: 0.7 }}>
                  {EDITION_INFO.standard.tagline}
                </p>
              </div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
              {EDITION_INFO.standard.features.map((feature, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  color: 'var(--moon-soft)'
                }}>
                  <Check style={{ width: 18, height: 18, color: '#22c55e', flexShrink: 0 }} />
                  {feature}
                </li>
              ))}
            </ul>

            <div style={{ borderTop: '1px solid rgba(250, 246, 237, 0.08)', paddingTop: '1.5rem' }}>
              {lengths.map((length) => (
                <div key={length} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <div>
                    <span className="app-body-sm" style={{ fontWeight: 500 }}>
                      {LENGTH_LABELS[length].name}
                    </span>
                    <span className="app-body-sm" style={{ opacity: 0.5, marginLeft: '0.5rem' }}>
                      {LENGTH_LABELS[length].pages}
                    </span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--amber-warm)' }}>
                    {formatPrice(PRICING.standard[length].price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Masterwork Edition */}
          <div className="app-card" style={{
            padding: '2rem',
            border: '2px solid #a855f7',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: -12,
              right: 24,
              background: '#a855f7',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: 50,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              RECOMMENDED
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: 48,
                height: 48,
                background: 'rgba(168, 85, 247, 0.15)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Crown style={{ width: 24, height: 24, color: '#a855f7' }} />
              </div>
              <div>
                <h2 className="app-heading-3" style={{ marginBottom: '0.25rem' }}>
                  {EDITION_INFO.masterwork.name} Edition
                </h2>
                <p className="app-body-sm" style={{ opacity: 0.7 }}>
                  {EDITION_INFO.masterwork.tagline}
                </p>
              </div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
              {EDITION_INFO.masterwork.features.map((feature, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  color: 'var(--moon-soft)'
                }}>
                  <Check style={{ width: 18, height: 18, color: '#a855f7', flexShrink: 0 }} />
                  {feature}
                </li>
              ))}
            </ul>

            <div style={{ borderTop: '1px solid rgba(250, 246, 237, 0.08)', paddingTop: '1.5rem' }}>
              {lengths.map((length) => (
                <div key={length} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <div>
                    <span className="app-body-sm" style={{ fontWeight: 500 }}>
                      {LENGTH_LABELS[length].name}
                    </span>
                    <span className="app-body-sm" style={{ opacity: 0.5, marginLeft: '0.5rem' }}>
                      {LENGTH_LABELS[length].pages}
                    </span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#a855f7' }}>
                    {formatPrice(PRICING.masterwork[length].price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{ maxWidth: 640, margin: '0 auto 4rem' }}>
          <h2 className="app-heading-2" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            Questions?
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 className="app-body" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                What&apos;s the difference between editions?
              </h3>
              <p className="app-body-sm" style={{ opacity: 0.7 }}>
                Standard gives you a quality AI-generated book with cover, exports, and sharing.
                Masterwork adds enhanced prose polish, deeper narrative cohesion, and a full audiobook narration.
              </p>
            </div>

            <div>
              <h3 className="app-body" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                How long does generation take?
              </h3>
              <p className="app-body-sm" style={{ opacity: 0.7 }}>
                Standard books take 5-15 minutes depending on length.
                Masterwork takes longer (15-45 minutes) due to the additional polish passes and audio generation.
              </p>
            </div>

            <div>
              <h3 className="app-body" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                Can I get a refund?
              </h3>
              <p className="app-body-sm" style={{ opacity: 0.7 }}>
                If generation fails or you&apos;re not satisfied with the result, contact us at hello@chronicle.town
                and we&apos;ll make it right.
              </p>
            </div>

            <div>
              <h3 className="app-body" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                Do I own the book I create?
              </h3>
              <p className="app-body-sm" style={{ opacity: 0.7 }}>
                Yes. The book you create is yours forever. Export it, share it, gift it, or keep it private.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <Link
            href="/create/new"
            className="app-button-primary"
            style={{ textDecoration: 'none', display: 'inline-flex' }}
          >
            <Sparkles style={{ width: 20, height: 20 }} />
            Start creating
            <ArrowRight style={{ width: 18, height: 18, marginLeft: '0.25rem' }} />
          </Link>
        </div>
      </main>
    </div>
  )
}
