import Link from 'next/link'
import '../legal/legal.css'

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/" className="legal-back">
          &larr; Back to Chronicle
        </Link>

        <h1 className="legal-title">Datenschutzerklärung</h1>
        <p className="legal-subtitle">(Privacy Policy)</p>

        {/* German Section */}
        <section className="legal-section">
          <h2>Datenschutzerklärung</h2>

          <h3>1. Verantwortlicher</h3>
          <p>Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO):</p>
          <div className="legal-address">
            <p><strong>MM FinTech UG (haftungsbeschränkt)</strong></p>
            <p>handelnd unter der Marke Chronicle</p>
            <p>Auguststraße 47A</p>
            <p>10119 Berlin</p>
            <p>Deutschland</p>
            <p>E-Mail: info@chronicle.town</p>
          </div>

          <h3>2. Beschreibung des Dienstes</h3>
          <p>Chronicle ist eine KI-basierte Plattform zur automatischen Erstellung, Personalisierung und Wiedergabe von Büchern, einschließlich Text-zu-Sprache-Funktionen (Audiobooks). Die Inhalte werden überwiegend automatisiert durch KI-Modelle erzeugt, verarbeitet und bereitgestellt.</p>

          <h3>3. Verarbeitete Daten</h3>

          <h4>a) Nutzungs- und Zugriffsdaten</h4>
          <ul>
            <li>IP-Adresse (gekürzt/anonymisiert, sofern möglich)</li>
            <li>Datum, Uhrzeit und Dauer der Nutzung</li>
            <li>Gerätetyp, Betriebssystem, Browser</li>
            <li>Fehler- und Performance-Logs</li>
          </ul>
          <p><strong>Zweck:</strong> Sicherer Betrieb, Stabilität und Optimierung der Plattform</p>
          <p><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)</p>

          <h4>b) Inhalts- und Interaktionsdaten</h4>
          <ul>
            <li>Texteingaben oder Auswahlparameter (z. B. Genre, Stil, Länge)</li>
            <li>Automatisch generierte Buch- und Audiobook-Inhalte</li>
            <li>Nutzungspräferenzen (z. B. Lese- oder Hörfortschritt)</li>
          </ul>
          <p><strong>Zweck:</strong> Bereitstellung und Personalisierung des Dienstes</p>
          <p><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</p>

          <h4>c) Audio- &amp; Text-zu-Sprache-Daten</h4>
          <p>Bei Nutzung der Hörfunktion werden Texte automatisiert an Text-to-Speech-Dienste übermittelt.</p>
          <ul>
            <li>Es erfolgt keine Sprachaufnahme des Nutzers</li>
            <li>Verarbeitet wird ausschließlich Text</li>
          </ul>
          <p><strong>Zweck:</strong> Erstellung von Audiobooks</p>
          <p><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO</p>

          <h3>4. Einsatz von KI-Modellen &amp; Auftragsverarbeitern</h3>
          <p>Chronicle nutzt externe Dienstleister für:</p>
          <ul>
            <li>Textgenerierung (KI-Modelle)</li>
            <li>Audiogenerierung (Text-to-Speech)</li>
            <li>Hosting &amp; Infrastruktur</li>
          </ul>
          <p><strong>Wichtige Hinweise:</strong></p>
          <ul>
            <li>Inhalte werden nicht öffentlich zugänglich gemacht</li>
            <li>Es erfolgt keine werbliche Nutzung der Daten</li>
            <li>Personenbezogene Daten werden nach Möglichkeit vermieden, anonymisiert oder pseudonymisiert</li>
            <li>Verarbeitung erfolgt im Rahmen von Auftragsverarbeitungsverträgen gemäß Art. 28 DSGVO</li>
          </ul>

          <h3>5. Speicherdauer &amp; Löschung</h3>
          <ul>
            <li>Daten werden nur so lange gespeichert, wie es für den jeweiligen Zweck erforderlich ist</li>
            <li>Technische Protokolle werden regelmäßig gelöscht</li>
            <li>Nutzer können jederzeit die Löschung ihrer Inhalte verlangen</li>
          </ul>

          <h3>6. Cookies &amp; lokale Speichertechnologien</h3>
          <p>Chronicle verwendet ausschließlich:</p>
          <ul>
            <li>technisch notwendige Cookies</li>
            <li>lokale Speichermechanismen (z. B. Local Storage)</li>
          </ul>
          <p><strong>Keine Nutzung von:</strong></p>
          <ul>
            <li>Tracking-Cookies</li>
            <li>Werbe- oder Marketing-Cookies</li>
          </ul>
          <p><strong>Rechtsgrundlage:</strong> § 25 Abs. 2 TTDSG, Art. 6 Abs. 1 lit. f DSGVO</p>

          <h3>7. Rechte der betroffenen Personen</h3>
          <p>Du hast jederzeit das Recht auf:</p>
          <ul>
            <li>Auskunft (Art. 15 DSGVO)</li>
            <li>Berichtigung (Art. 16 DSGVO)</li>
            <li>Löschung (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch (Art. 21 DSGVO)</li>
          </ul>
          <p>Anfragen bitte an: info@chronicle.town</p>

          <h3>8. Beschwerderecht</h3>
          <p>Du hast das Recht, dich bei einer Datenschutzaufsichtsbehörde zu beschweren. Zuständig ist u. a. der Berliner Beauftragte für Datenschutz und Informationsfreiheit.</p>

          <h3>9. Datensicherheit</h3>
          <p>Wir setzen angemessene technische und organisatorische Maßnahmen ein, darunter:</p>
          <ul>
            <li>TLS-Verschlüsselung</li>
            <li>Zugriffsbeschränkungen</li>
            <li>Datensparsamkeit</li>
            <li>Trennung von Inhalts- und Systemdaten</li>
          </ul>

          <h3>10. Änderungen dieser Datenschutzerklärung</h3>
          <p>Wir behalten uns vor, diese Datenschutzerklärung bei technischen oder rechtlichen Änderungen anzupassen. Die jeweils aktuelle Version ist unter chronicle.town abrufbar.</p>
        </section>

        <div className="legal-divider" />

        {/* English Section */}
        <section className="legal-section">
          <h2>Privacy Policy</h2>

          <h3>1. Controller</h3>
          <p>The controller within the meaning of the GDPR is:</p>
          <div className="legal-address">
            <p><strong>MM FinTech UG (haftungsbeschränkt)</strong></p>
            <p>operating under the brand Chronicle</p>
            <p>Auguststraße 47A</p>
            <p>10119 Berlin</p>
            <p>Germany</p>
            <p>E-mail: info@chronicle.town</p>
          </div>

          <h3>2. Description of the Service</h3>
          <p>Chronicle is an AI-powered platform for the automatic creation, personalization, and playback of books, including text-to-speech audiobook functionality. Content is largely generated and processed automatically by AI models.</p>

          <h3>3. Data Processed</h3>

          <h4>a) Usage and Access Data</h4>
          <ul>
            <li>IP address (anonymized where possible)</li>
            <li>Date, time, and duration of use</li>
            <li>Device type, operating system, browser</li>
            <li>Error and performance logs</li>
          </ul>
          <p><strong>Purpose:</strong> Operation, security, and optimization of the platform</p>
          <p><strong>Legal basis:</strong> Art. 6(1)(f) GDPR (legitimate interest)</p>

          <h4>b) Content and Interaction Data</h4>
          <ul>
            <li>Text inputs or configuration parameters</li>
            <li>AI-generated books and audiobooks</li>
            <li>Usage preferences (e.g. reading or listening progress)</li>
          </ul>
          <p><strong>Purpose:</strong> Provision and personalization of the service</p>
          <p><strong>Legal basis:</strong> Art. 6(1)(b) GDPR (contract performance)</p>

          <h4>c) Text-to-Speech Data</h4>
          <p>For audiobook playback, text is transmitted to text-to-speech providers.</p>
          <ul>
            <li>No voice recordings of users are made</li>
            <li>Only text data is processed</li>
          </ul>
          <p><strong>Purpose:</strong> Audiobook generation</p>
          <p><strong>Legal basis:</strong> Art. 6(1)(b) GDPR</p>

          <h3>4. Use of AI Models &amp; Processors</h3>
          <p>Chronicle uses external providers for:</p>
          <ul>
            <li>AI text generation</li>
            <li>Text-to-speech services</li>
            <li>Hosting and infrastructure</li>
          </ul>
          <p><strong>Key principles:</strong></p>
          <ul>
            <li>No public disclosure of user content</li>
            <li>No advertising use of data</li>
            <li>Personal data is minimized or anonymized where possible</li>
            <li>Processing is governed by data processing agreements under Art. 28 GDPR</li>
          </ul>

          <h3>5. Data Retention &amp; Deletion</h3>
          <ul>
            <li>Data is stored only as long as necessary</li>
            <li>Technical logs are deleted regularly</li>
            <li>Users may request deletion of their content at any time</li>
          </ul>

          <h3>6. Cookies &amp; Local Storage</h3>
          <p>Chronicle uses only:</p>
          <ul>
            <li>technically necessary cookies</li>
            <li>local storage mechanisms</li>
          </ul>
          <p>No tracking or advertising cookies are used.</p>
          <p><strong>Legal basis:</strong> Section 25(2) TTDSG, Art. 6(1)(f) GDPR</p>

          <h3>7. Your Rights</h3>
          <p>You have the right to:</p>
          <ul>
            <li>Access (Art. 15 GDPR)</li>
            <li>Rectification (Art. 16 GDPR)</li>
            <li>Erasure (Art. 17 GDPR)</li>
            <li>Restriction of processing (Art. 18 GDPR)</li>
            <li>Data portability (Art. 20 GDPR)</li>
            <li>Object to processing (Art. 21 GDPR)</li>
          </ul>
          <p>Contact: info@chronicle.town</p>

          <h3>8. Right to Lodge a Complaint</h3>
          <p>You have the right to lodge a complaint with a supervisory authority, in particular the Berlin Commissioner for Data Protection and Freedom of Information.</p>

          <h3>9. Data Security</h3>
          <p>We implement appropriate technical and organizational measures, including:</p>
          <ul>
            <li>Encrypted connections (TLS)</li>
            <li>Access controls</li>
            <li>Data minimization</li>
            <li>Separation of content and system data</li>
          </ul>

          <h3>10. Changes to this Privacy Policy</h3>
          <p>We may update this Privacy Policy to reflect technical or legal changes. The current version is available at chronicle.town.</p>
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
