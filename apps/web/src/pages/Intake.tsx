import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Scale, ChevronRight, ChevronLeft, CheckCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, title: 'Ihre Sprache',      sub: 'Muttersprache und Deutschkenntnisse' },
  { id: 2, title: 'Ihr Wohnort',       sub: 'Bundesland und Herkunft' },
  { id: 3, title: 'Ihre Qualifikation',sub: 'Ausbildung und Erfahrung' },
  { id: 4, title: 'Kontaktdaten',      sub: 'Damit wir Sie erreichen können' },
]

const DEUTSCH_LEVELS = ['A1','A2','B1','B2','C1','C2','Muttersprachlich']

const DEGREE_OPTIONS = [
  'Abitur / Matura',
  'Berufsausbildung (IHK/Handwerk)',
  'Bachelor / Licenciatura',
  'Master / Magistr',
  'Diplom / Staatsexamen',
  'Promotion (Dr.)',
  'Kein Hochschulabschluss',
]

type Form = {
  nativeLanguage: string
  deutschLevel: string
  yearsInGermany: string
  germanCitizen: boolean
  citizenshipYear: string
  currentCity: string
  bundeslandCode: string
  countryOfOrigin: string
  highestDegree: string
  degreeField: string
  degreeCountry: string
  degreeYear: string
  hasTranslationExp: boolean
  translationYears: string
  additionalInfo: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

const EMPTY: Form = {
  nativeLanguage: '', deutschLevel: '', yearsInGermany: '', germanCitizen: false,
  citizenshipYear: '', currentCity: '', bundeslandCode: '', countryOfOrigin: '',
  highestDegree: '', degreeField: '', degreeCountry: '', degreeYear: '',
  hasTranslationExp: false, translationYears: '', additionalInfo: '',
  firstName: '', lastName: '', email: '', phone: '',
}

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', required }: any) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

function Select({ value, onChange, options, placeholder }: any) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      <option value="">{placeholder || '— bitte wählen —'}</option>
      {options.map((o: any) => (
        <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
          {typeof o === 'string' ? o : o.label}
        </option>
      ))}
    </select>
  )
}

export default function IntakePage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<Form>(EMPTY)
  const [done, setDone] = useState(false)
  const [ref, setRef] = useState('')

  const { data: bundeslaender = [] } = useQuery({
    queryKey: ['intake-bundeslaender'],
    queryFn: () => api.get('/intake/bundeslaender').then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/intake', data).then(r => r.data),
    onSuccess: (data) => {
      setRef(data.candidateRef)
      setDone(true)
    },
  })

  function set(field: keyof Form, value: any) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function canNext() {
    if (step === 1) return form.nativeLanguage && form.deutschLevel && form.yearsInGermany
    if (step === 2) return form.currentCity && form.bundeslandCode && form.countryOfOrigin
    if (step === 3) return form.highestDegree && form.degreeField && form.degreeCountry
    if (step === 4) return form.firstName && form.lastName && form.email
    return true
  }

  function handleSubmit() {
    mutation.mutate({
      ...form,
      yearsInGermany:  Number(form.yearsInGermany) || 0,
      translationYears: form.hasTranslationExp ? (Number(form.translationYears) || 0) : undefined,
      degreeYear:      form.degreeYear ? Number(form.degreeYear) : undefined,
      citizenshipYear: form.germanCitizen ? undefined : (form.citizenshipYear ? Number(form.citizenshipYear) : undefined),
    })
  }

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bewerbung eingegangen!</h1>
        <p className="text-gray-600 mb-4">
          Ihre Bewerbungs-ID: <span className="font-mono font-bold text-blue-700">{ref}</span>
        </p>
        <p className="text-sm text-gray-500">
          Wir prüfen Ihre Unterlagen und melden uns innerhalb von <strong>2–3 Werktagen</strong> per E-Mail oder Telefon.
        </p>
        <div className="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
          <p className="font-medium mb-1">Was als nächstes passiert:</p>
          <ol className="list-decimal list-inside space-y-1 text-left">
            <li>Wir prüfen Ihre Eignung für Ihr Bundesland</li>
            <li>Bei positiver Einschätzung rufen wir Sie an</li>
            <li>Gemeinsam starten wir den Ermächtigungsprozess</li>
          </ol>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">speak2</p>
            <p className="text-xs text-gray-500">Übersetzer-Ermächtigung</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                step === s.id ? 'bg-blue-600 text-white' :
                step > s.id  ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              )}>
                {step > s.id ? '✓' : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-0.5 flex-1 mx-2', step > s.id ? 'bg-green-400' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-0.5">{STEPS[step-1].title}</h2>
          <p className="text-sm text-gray-500 mb-6">{STEPS[step-1].sub}</p>

          {/* ── Step 1: Sprache ── */}
          {step === 1 && (
            <div className="space-y-4">
              <Field label="Muttersprache" required hint="z.B. Usbekisch, Tigrinya, Tamil, Georgisch, Farsi">
                <Input value={form.nativeLanguage} onChange={(v: string) => set('nativeLanguage', v)} placeholder="z.B. Usbekisch" required />
              </Field>
              <Field label="Ihr Deutsch-Niveau" required>
                <Select value={form.deutschLevel} onChange={(v: string) => set('deutschLevel', v)} options={DEUTSCH_LEVELS} placeholder="— bitte wählen —" />
              </Field>
              <Field label="Wie viele Jahre leben Sie schon in Deutschland?" required>
                <Input value={form.yearsInGermany} onChange={(v: string) => set('yearsInGermany', v)} type="number" placeholder="z.B. 5" required />
              </Field>
              <Field label="Staatsbürgerschaft">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.germanCitizen} onChange={() => set('germanCitizen', true)} className="text-blue-600" />
                    <span className="text-sm">Ich habe die deutsche Staatsbürgerschaft</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={!form.germanCitizen} onChange={() => set('germanCitizen', false)} className="text-blue-600" />
                    <span className="text-sm">Ich habe keine deutsche Staatsbürgerschaft (noch)</span>
                  </label>
                  {!form.germanCitizen && (
                    <div className="ml-6">
                      <Field label="Einbürgerung beantragt / geplant für Jahr" hint="Leer lassen wenn noch nicht beantragt">
                        <Input value={form.citizenshipYear} onChange={(v: string) => set('citizenshipYear', v)} type="number" placeholder="z.B. 2026" />
                      </Field>
                    </div>
                  )}
                </div>
              </Field>
            </div>
          )}

          {/* ── Step 2: Wohnort ── */}
          {step === 2 && (
            <div className="space-y-4">
              <Field label="Aktuelle Stadt / Wohnort" required>
                <Input value={form.currentCity} onChange={(v: string) => set('currentCity', v)} placeholder="z.B. München" required />
              </Field>
              <Field label="Bundesland" required>
                <Select
                  value={form.bundeslandCode}
                  onChange={(v: string) => set('bundeslandCode', v)}
                  options={bundeslaender.map((b: any) => ({ value: b.code, label: `${b.name} (${b.code})` }))}
                  placeholder="— Bundesland wählen —"
                />
              </Field>
              <Field label="Herkunftsland (Geburtsland)" required>
                <Input value={form.countryOfOrigin} onChange={(v: string) => set('countryOfOrigin', v)} placeholder="z.B. Usbekistan" required />
              </Field>
            </div>
          )}

          {/* ── Step 3: Qualifikation ── */}
          {step === 3 && (
            <div className="space-y-4">
              <Field label="Höchster Bildungsabschluss" required>
                <Select value={form.highestDegree} onChange={(v: string) => set('highestDegree', v)} options={DEGREE_OPTIONS} />
              </Field>
              <Field label="Fachrichtung / Studiengang" required hint="z.B. Germanistik, Mathematik (Lehramt), Informatik, Medizin">
                <Input value={form.degreeField} onChange={(v: string) => set('degreeField', v)} placeholder="z.B. Lehramt Mathematik" required />
              </Field>
              <Field label="Land des Abschlusses" required hint="In welchem Land haben Sie den Abschluss gemacht?">
                <Input value={form.degreeCountry} onChange={(v: string) => set('degreeCountry', v)} placeholder="z.B. Usbekistan" required />
              </Field>
              <Field label="Jahr des Abschlusses">
                <Input value={form.degreeYear} onChange={(v: string) => set('degreeYear', v)} type="number" placeholder="z.B. 2018" />
              </Field>
              <Field label="Haben Sie Erfahrung als Übersetzer/Dolmetscher?">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.hasTranslationExp} onChange={e => set('hasTranslationExp', e.target.checked)} className="rounded text-blue-600" />
                    <span className="text-sm">Ja, ich habe bereits als Übersetzer/Dolmetscher gearbeitet</span>
                  </label>
                  {form.hasTranslationExp && (
                    <div className="ml-6">
                      <Field label="Wie viele Jahre Erfahrung?">
                        <Input value={form.translationYears} onChange={(v: string) => set('translationYears', v)} type="number" placeholder="z.B. 3" />
                      </Field>
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Weitere Informationen" hint="z.B. besondere Qualifikationen, Zertifikate, Anerkennungen in Deutschland">
                <textarea
                  value={form.additionalInfo}
                  onChange={e => set('additionalInfo', e.target.value)}
                  rows={3}
                  placeholder="Optional: Weitere relevante Qualifikationen oder Besonderheiten..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </Field>
            </div>
          )}

          {/* ── Step 4: Kontakt ── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Vorname" required>
                  <Input value={form.firstName} onChange={(v: string) => set('firstName', v)} placeholder="Max" required />
                </Field>
                <Field label="Nachname" required>
                  <Input value={form.lastName} onChange={(v: string) => set('lastName', v)} placeholder="Mustermann" required />
                </Field>
              </div>
              <Field label="E-Mail-Adresse" required>
                <Input value={form.email} onChange={(v: string) => set('email', v)} type="email" placeholder="max@beispiel.de" required />
              </Field>
              <Field label="Telefonnummer" hint="Für Rückfragen und unser Erstgespräch">
                <Input value={form.phone} onChange={(v: string) => set('phone', v)} type="tel" placeholder="+49 171 1234567" />
              </Field>

              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Was passiert nach Ihrer Bewerbung?</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Unsere KI prüft Ihre Eignung für Ihr Bundesland</li>
                  <li>Bei positiver Einschätzung melden wir uns in 2–3 Werktagen</li>
                  <li>Wir begleiten Sie kostenlos durch den gesamten Prozess</li>
                </ol>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Zurück
              </button>
            )}
            <div className="flex-1" />
            {step < 4 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                Weiter <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canNext() || mutation.isPending}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {mutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Wird verarbeitet…</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Bewerbung absenden</>
                )}
              </button>
            )}
          </div>
          {mutation.isError && (
            <p className="text-sm text-red-600 mt-2 text-center">Fehler beim Senden — bitte nochmal versuchen.</p>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          speak2 · Paderborn · Ihre Daten werden vertraulich behandelt
        </p>
      </div>
    </div>
  )
}
