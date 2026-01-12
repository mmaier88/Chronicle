import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import './landing.css'

// Low-quality placeholder for progressive loading
const blurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIRAAAgEDBAMBAAAAAAAAAAAAAQIDAAQRBQYSITFBUXH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAIDAQAAAAAAAAAAAAAAAAECAAMREv/aAAwDAQACEQMRAD8AyXb+oXVtp17a2t3NDbXQUTxpIVWUKcruB7GPtKdPRHamaFCR2CgJ+0pQhTiV2UR7JP/Z'

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
        <Image
          src="/hero.jpg"
          alt="A magical world of stories"
          className="hero-image"
          fill
          priority
          placeholder="blur"
          blurDataURL={blurDataURL}
          sizes="100vw"
          quality={85}
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-tagline">Stories made for you</p>
          <h1 className="hero-headline">
            Listen to the story you didn&apos;t know you needed
          </h1>
          <p className="hero-subheadline">
            Chronicle creates original stories — written for you and read aloud in a calm, human voice.
            Shaped around your taste, your mood, and the moment you&apos;re in.
            Not algorithms. Not bestseller lists. Just you.
          </p>
          <p className="hero-audio-badge">Every story is available in immersive audio.</p>
          <div className="hero-cta-group">
            <Link href="/login?redirect=/create" className="cta-button">
              Start Listening
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <p className="hero-micro-cue">Perfect for evenings, walks, and quiet moments.</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-links">
            <Link href="/imprint">Imprint</Link>
            <Link href="/legal">Legal</Link>
          </div>
        </footer>
      </section>
    </div>
  )
}
