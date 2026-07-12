import { Link } from 'react-router-dom'
import { Scale } from 'lucide-react'

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">speak2</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-5">{title}</h1>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-3 [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-5 [&_h2]:mb-1 [&_h2]:text-sm">
            {children}
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-gray-400">
          <Link to="/impressum" className="hover:underline">Impressum</Link>
          <span className="mx-2">·</span>
          <Link to="/datenschutz" className="hover:underline">Datenschutz</Link>
        </div>
      </div>
    </div>
  )
}

export function ImpressumPage() {
  return (
    <LegalShell title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        speak2 – Ramón Hansmeyer<br />
        Winfriedstr. 4<br />
        33098 Paderborn<br />
        Deutschland
      </p>
      <h2>Kontakt</h2>
      <p>
        E-Mail: info@speak2.de<br />
        Telefon: +49 151 61451481
      </p>
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>Ramón Hansmeyer, Anschrift wie oben.</p>
    </LegalShell>
  )
}

export function DatenschutzPage() {
  return (
    <LegalShell title="Datenschutzerklärung">
      <h2>1. Verantwortlicher</h2>
      <p>
        speak2 – Ramón Hansmeyer, Winfriedstr. 4, 33098 Paderborn, E-Mail: info@speak2.de.
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <p>
        Im Rahmen Ihrer Bewerbung und der Betreuung Ihres Ermächtigungs-/Beeidigungsverfahrens
        verarbeiten wir insbesondere: Name, Kontaktdaten (E-Mail, Telefon, Anschrift), Geburtsdatum,
        Staatsangehörigkeit bzw. Aufenthaltstitel, Sprach- und Qualifikationsangaben sowie die von
        Ihnen hochgeladenen Dokumente (z. B. Lebenslauf, Zeugnisse, Zertifikate).
      </p>

      <h2>3. Zweck und Rechtsgrundlage</h2>
      <p>
        Die Verarbeitung erfolgt zur Anbahnung und Durchführung der Zusammenarbeit sowie zur
        Unterstützung Ihres Ermächtigungsverfahrens bei den zuständigen Gerichten/Behörden.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen/Vertrag) sowie
        Art. 6 Abs. 1 lit. a DSGVO (Einwilligung), soweit Sie uns Daten freiwillig übermitteln.
      </p>

      <h2>4. Speicherung / Auftragsverarbeiter</h2>
      <p>
        Ihre Daten und Dokumente werden auf Servern innerhalb der EU (Frankfurt am Main, Deutschland)
        bei unseren Dienstleistern Supabase und Railway/Vercel gespeichert. Mit diesen bestehen bzw.
        werden Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO geschlossen.
      </p>

      <h2>5. Speicherdauer</h2>
      <p>
        Wir speichern Ihre Daten, solange dies für die genannten Zwecke erforderlich ist bzw. bis Sie
        Ihre Einwilligung widerrufen oder der Verarbeitung widersprechen, soweit keine gesetzlichen
        Aufbewahrungspflichten entgegenstehen.
      </p>

      <h2>6. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17),
        Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie Widerspruch
        (Art. 21) und Widerruf einer Einwilligung (Art. 7 Abs. 3 DSGVO). Zudem besteht ein
        Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde. Wenden Sie sich hierzu an info@speak2.de.
      </p>

      <p className="text-xs text-gray-400 pt-2">
        Diese Erklärung ist eine Vorlage und sollte vor dem produktiven Einsatz rechtlich geprüft werden.
      </p>
    </LegalShell>
  )
}
