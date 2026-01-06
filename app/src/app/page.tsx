import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import './landing.css'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, go straight to the app
  if (user) {
    redirect('/create')
  }

  return (
    <div className="landing-page">
      {/* HERO - Full screen */}
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
          <Link href="/login?redirect=/create" className="cta-button">
            Find Your Story
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>
    </div>
  )
}
