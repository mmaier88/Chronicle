import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import './landing.css'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, go straight to the app
  if (user) {
    redirect('/vibe')
  }

  return (
    <div className="landing-page">
      {/* HERO */}
      <section className="hero">
        <img
          src="/hero.jpg"
          alt="A magical world of stories"
          className="hero-image"
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-tagline">Stories made for you</p>
          <h1 className="hero-headline">
            Find the story you<br />
            didn&apos;t know you needed
          </h1>
          <p className="hero-subheadline">
            Chronicle creates original stories shaped around your taste, your mood, and what you&apos;re drawn to. Not algorithms. Not bestseller lists. Just you.
          </p>
          <Link href="/login" className="cta-button">
            Find Your Story
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="section section-dark">
        <div className="section-inner">
          <p className="section-label">The problem</p>
          <h2 className="section-headline">Finding the right story shouldn&apos;t feel like settling</h2>
          <p className="section-body">
            There are more books than ever — yet so many feel almost right. Recommended, but not quite you. Well written, but wrong for the moment. Interesting, but missing something.
          </p>
        </div>
      </section>

      {/* WHAT IS CHRONICLE */}
      <section className="section section-warm">
        <div className="section-inner">
          <p className="section-label">What is Chronicle</p>
          <h2 className="section-headline">Stories designed around you</h2>
          <p className="section-body">
            You start by sharing what matters to you as a reader — and Chronicle shapes an original book around that intent. You don&apos;t need to write. You don&apos;t need to know the ending. You simply begin with a feeling — and a curiosity.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <div className="steps-container">
          <div className="steps-header">
            <p className="section-label">How it works</p>
            <h2 className="section-headline">From feeling to finished story</h2>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Share what you&apos;re drawn to</h3>
              <p className="step-desc">Choose genres, tone, and the kind of story you&apos;re in the mood for</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">Meet the characters</h3>
              <p className="step-desc">Before the story begins, you&apos;re introduced to who they are and what drives them</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Discover their story</h3>
              <p className="step-desc">A complete book unfolds, shaped around your taste and crafted just for you</p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <p className="section-label">Ready?</p>
        <h2 className="section-headline">Your story is waiting</h2>
        <p className="section-body center">Tell us what you&apos;re in the mood for — we&apos;ll take it from there.</p>
        <Link href="/login" className="cta-button">
          Find Your Story
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <p className="footer-brand">Chronicle</p>
        <div className="footer-links">
          <a href="#">About</a>
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
        </div>
      </footer>
    </div>
  )
}
