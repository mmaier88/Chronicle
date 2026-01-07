import Link from 'next/link'
import '../legal/legal.css'

export default function ImprintPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/" className="legal-back">
          &larr; Back to Chronicle
        </Link>

        <h1 className="legal-title">Imprint</h1>
        <p className="legal-subtitle">(Impressum)</p>

        {/* English Section */}
        <section className="legal-section">
          <h2>Imprint / Legal Notice</h2>
          <p className="legal-note">Information pursuant to Section 5 of the German Digital Services Act (DDG)</p>

          <div className="legal-address">
            <p><strong>MM FinTech UG (haftungsbeschränkt)</strong></p>
            <p>operating under the brand Chronicle</p>
            <p>Auguststraße 47A</p>
            <p>10119 Berlin</p>
            <p>Germany</p>
          </div>

          <p><strong>Represented by:</strong><br />
          Managing Director: Markus Imanuel Maier</p>

          <p><strong>Contact:</strong><br />
          E-mail: info@chronicle.town</p>

          <p><strong>Commercial Register Entry:</strong><br />
          Registered with the Commercial Register<br />
          Register Court: Local Court (Amtsgericht) Berlin-Charlottenburg<br />
          Registration Number: HRB 218342</p>
        </section>

        <div className="legal-divider" />

        {/* German Section */}
        <section className="legal-section">
          <h2>Impressum</h2>
          <p className="legal-note">Angaben gemäß § 5 DDG</p>

          <div className="legal-address">
            <p><strong>MM FinTech UG (haftungsbeschränkt)</strong></p>
            <p>handelnd unter der Marke Chronicle</p>
            <p>Auguststraße 47A</p>
            <p>10119 Berlin</p>
            <p>Deutschland</p>
          </div>

          <p><strong>Vertreten durch:</strong><br />
          Geschäftsführer: Markus Imanuel Maier</p>

          <p><strong>Kontakt:</strong><br />
          E-Mail: info@chronicle.town</p>

          <p><strong>Registereintrag:</strong><br />
          Eingetragen im Handelsregister<br />
          Registergericht: Amtsgericht Berlin-Charlottenburg<br />
          Handelsregisternummer: HRB 218342</p>

          <p><strong>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</strong><br />
          Markus Imanuel Maier<br />
          Anschrift wie oben</p>
        </section>

        <footer className="legal-footer">
          <Link href="/" className="legal-back">
            &larr; Back to Chronicle
          </Link>
        </footer>
      </div>
    </div>
  )
}
