import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Scale, ChevronRight, ChevronLeft, CheckCircle, Loader2, Plus, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Umfassende Sprachliste (alphabetisch) ──────────────────────────────────
const ALL_LANGUAGES = [
  'Albanisch','Amharisch','Arabisch','Armenisch','Aserbaidschanisch',
  'Bengalisch','Bosnisch','Bulgarisch',
  'Chinesisch (Mandarin)','Chinesisch (Kantonesisch)',
  'Dari','Deutsch',
  'Englisch','Estnisch',
  'Farsi (Persisch)','Finnisch','Französisch',
  'Georgisch','Griechisch','Gujarati',
  'Haussa','Hebräisch','Hindi','Hmong',
  'Igbo','Indonesisch',
  'Japanisch',
  'Kannada','Kasachisch','Katalanisch','Khmer','Kirgisisch','Koreanisch','Kroatisch','Kurdisch (Kurmandschi)','Kurdisch (Sorani)',
  'Laotisch','Lettisch','Litauisch',
  'Malagasy','Malayisch','Marathi','Mazedonisch','Mongolisch',
  'Nepalesisch','Niederländisch','Norwegisch',
  'Paschtu','Polnisch','Portugiesisch',
  'Rumänisch','Russisch',
  'Serbisch','Singhalesisch','Slowakisch','Slowenisch','Somali','Spanisch','Suaheli',
  'Tadschikisch','Tamil','Telugu','Tigrinya','Tschechisch','Tschetschenisch','Türkisch','Turkmenisch',
  'Ukrainisch','Ungarisch','Urdu','Usbekisch',
  'Vietnamesisch',
  'Weißrussisch',
  'Yoruba',
  'Andere (bitte angeben)',
].sort((a, b) => a.localeCompare(b, 'de'))

const LANGUAGE_LEVELS = [
  { value: 'L1', label: 'Muttersprache (L1)' },
  { value: 'C2', label: 'C2 — Annähernd muttersp.' },
  { value: 'C1', label: 'C1 — Fachkundige Kenntnis' },
  { value: 'B2', label: 'B2 — Selbstständige Nutzung' },
  { value: 'B1', label: 'B1 — Mittelstufe' },
  { value: 'A2', label: 'A2 — Grundlegende Kenntnisse' },
  { value: 'A1', label: 'A1 — Anfänger' },
]

const EDUCATION_LEVELS_IN_LANGUAGE = [
  { value: 'studium', label: 'Studium (Hochschulabschluss)' },
  { value: 'abitur', label: 'Abitur / Matura (12+ Schuljahre)' },
  { value: 'realschule', label: 'Realschule / Mittelschule (9-10 J.)' },
  { value: 'grundschule', label: 'Grundschule (1-4 J.) oder weniger' },
  { value: 'keine', label: 'Keine Schulbildung in dieser Sprache' },
]

const CERT_TYPES: Record<string, string[]> = {
  'Deutsch': ['telc Deutsch', 'Goethe-Institut', 'TestDaF', 'DSH', 'ÖSD', 'BULATS', 'Sonstiges'],
  'Englisch': ['IELTS', 'TOEFL', 'Cambridge (FCE/CAE/CPE)', 'TOEIC', 'Sonstiges'],
  'default': ['Staatliche Prüfung', 'Universitätszertifikat', 'ECL', 'CILS', 'DELE', 'DELF', 'Sonstiges'],
}

// ── Suchbares Sprach-Dropdown ──────────────────────────────────────────────
function LanguageDropdown({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(value || '')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setSearch(value || '') }, [value])

  const filtered = search.length === 0
    ? ALL_LANGUAGES
    : ALL_LANGUAGES.filter(l => l.toLowerCase().startsWith(search.toLowerCase()))
      .concat(ALL_LANGUAGES.filter(l => !l.toLowerCase().startsWith(search.toLowerCase()) && l.toLowerCase().includes(search.toLowerCase())))

  return (
    <div ref={ref} className="relative">
      <input
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || 'Sprache eingeben oder wählen…'}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.slice(0, 50).map(lang => (
            <button
              key={lang}
              type="button"
              onMouseDown={() => { onChange(lang); setSearch(lang); setOpen(false) }}
              className={cn('w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors',
                lang === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800')}
            >
              {lang}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sprach-Eintrag Komponente ──────────────────────────────────────────────
type LangEntry = {
  language: string
  level: string
  // Für L1:
  educationInLanguage: string    // studium/abitur/realschule/grundschule/keine
  educationCountry: string       // In welchem Land?
  ageArrivedGermany: string      // Alter bei Ankunft in DE (wenn L1)
  // Für andere Level:
  hasCertificate: boolean
  certificateType: string
}

const EMPTY_LANG: LangEntry = {
  language: '', level: '', educationInLanguage: '', educationCountry: '',
  ageArrivedGermany: '', hasCertificate: false, certificateType: '',
}

function LangEntryForm({ entry, index, onChange, onRemove, isFirst }: {
  entry: LangEntry; index: number; onChange: (e: LangEntry) => void; onRemove?: () => void; isFirst: boolean
}) {
  const isNative = entry.level === 'L1'
  const weakProof = isNative && entry.educationInLanguage === 'keine'
  const earlyArrival = isNative && entry.ageArrivedGermany !== '' && Number(entry.ageArrivedGermany) <= 8

  return (
    <div className={cn('border rounded-xl p-4 space-y-3', index === 0 ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white')}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {index === 0 ? '1. Sprache (Hauptsprache)' : `${index + 1}. Sprache`}
        </span>
        {onRemove && (
          <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sprache */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Sprache *</label>
          <LanguageDropdown value={entry.language} onChange={v => onChange({ ...entry, language: v })} />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Niveau *</label>
          <select
            value={entry.level}
            onChange={e => onChange({ ...entry, level: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— wählen —</option>
            {LANGUAGE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>

      {/* Nachweis-Fragen für Muttersprache */}
      {isNative && entry.language && (
        <div className="space-y-3 border-t border-blue-100 pt-3">
          <p className="text-xs font-semibold text-blue-700">📋 Nachweis für {entry.language}:</p>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">
              Höchste abgeschlossene Schulbildung <strong>in {entry.language}</strong> *
            </label>
            <select
              value={entry.educationInLanguage}
              onChange={e => onChange({ ...entry, educationInLanguage: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— bitte wählen —</option>
              {EDUCATION_LEVELS_IN_LANGUAGE.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          {entry.educationInLanguage && entry.educationInLanguage !== 'keine' && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">In welchem Land war diese Schule/Uni? *</label>
              <input
                value={entry.educationCountry}
                onChange={e => onChange({ ...entry, educationCountry: e.target.value })}
                placeholder="z.B. Usbekistan, Ukraine, Iran…"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">
              Mit wie vielen Jahren sind Sie nach Deutschland gezogen?
              <span className="text-gray-400 ml-1">(0 = in Deutschland geboren)</span>
            </label>
            <input
              type="number"
              value={entry.ageArrivedGermany}
              onChange={e => onChange({ ...entry, ageArrivedGermany: e.target.value })}
              placeholder="z.B. 15"
              min={0} max={60}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Warnung: Schwacher Nachweis */}
          {(weakProof || earlyArrival) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              ⚠️ <strong>Wichtiger Hinweis:</strong>{' '}
              {earlyArrival && `Sie kamen mit ${entry.ageArrivedGermany} Jahren nach Deutschland — für Gerichte ist der Nachweis der Sprachkompetenz dann schwieriger. `}
              {weakProof && `Ohne formale Schulbildung in ${entry.language} fehlt ein wichtiger Nachweis. `}
              Bitte geben Sie trotzdem alle Informationen an — wir beraten Sie dann individuell.
            </div>
          )}
        </div>
      )}

      {/* Nachweis für nicht-Muttersprachen */}
      {!isNative && entry.level && entry.language && (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-600">📋 Nachweis für {entry.language} ({entry.level}):</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={entry.hasCertificate}
              onChange={e => onChange({ ...entry, hasCertificate: e.target.checked })}
              className="rounded text-blue-600"
            />
            <span className="text-sm text-gray-700">Ich habe ein offizielles Sprachzertifikat</span>
          </label>
          {entry.hasCertificate && (
            <select
              value={entry.certificateType}
              onChange={e => onChange({ ...entry, certificateType: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Zertifikat wählen —</option>
              {(CERT_TYPES[entry.language] || CERT_TYPES['default']).map(c =>
                <option key={c} value={c}>{c}</option>
              )}
            </select>
          )}
        </div>
      )}
    </div>
  )
}

const STEPS = [
  { id: 1, title: 'Sprachkenntnisse', sub: 'Alle Ihre Sprachen und Nachweise' },
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
  languages: LangEntry[]         // alle Sprachen außer Deutsch
  deutschLevel: string
  deutschCert: string
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
  languages: [{ ...EMPTY_LANG }],
  deutschLevel: '', deutschCert: '', yearsInGermany: '', germanCitizen: false,
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

  function updateLang(i: number, entry: LangEntry) {
    const langs = [...form.languages]
    langs[i] = entry
    setForm(f => ({ ...f, languages: langs }))
  }

  function addLang() {
    setForm(f => ({ ...f, languages: [...f.languages, { ...EMPTY_LANG }] }))
  }

  function removeLang(i: number) {
    setForm(f => ({ ...f, languages: f.languages.filter((_, idx) => idx !== i) }))
  }

  function canNext() {
    if (step === 1) {
      const hasValidLang = form.languages.some(l => l.language && l.level)
      return hasValidLang && form.deutschLevel && form.yearsInGermany
    }
    if (step === 2) return form.currentCity && form.bundeslandCode && form.countryOfOrigin
    if (step === 3) return form.highestDegree && form.degreeField && form.degreeCountry
    if (step === 4) return form.firstName && form.lastName && form.email
    return true
  }

  function handleSubmit() {
    // Hauptsprache aus dem ersten Eintrag ableiten
    const mainLang = form.languages[0]
    mutation.mutate({
      ...form,
      nativeLanguage:  mainLang?.language || '',
      languagePair:    `${mainLang?.language || ''} ↔ Deutsch`,
      languageDetails: JSON.stringify(form.languages), // alle Sprachen als JSON
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

          {/* ── Step 1: Sprachkenntnisse ── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Sprachen */}
              <div className="space-y-3">
                {form.languages.map((entry, i) => (
                  <LangEntryForm
                    key={i}
                    entry={entry}
                    index={i}
                    isFirst={i === 0}
                    onChange={e => updateLang(i, e)}
                    onRemove={i > 0 ? () => removeLang(i) : undefined}
                  />
                ))}
                {form.languages.length < 5 && (
                  <button
                    type="button"
                    onClick={addLang}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Weitere Sprache hinzufügen
                  </button>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Deutsch</p>

                <Field label="Ihr Deutsch-Niveau" required>
                  <Select value={form.deutschLevel} onChange={(v: string) => set('deutschLevel', v)} options={DEUTSCH_LEVELS} placeholder="— bitte wählen —" />
                </Field>

                {form.deutschLevel && form.deutschLevel !== 'Muttersprachlich' && (
                  <Field label="Haben Sie ein Deutschzertifikat?" hint="z.B. telc, Goethe, TestDaF, DSH">
                    <select
                      value={form.deutschCert}
                      onChange={e => set('deutschCert', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Kein Zertifikat / wählen —</option>
                      {CERT_TYPES['Deutsch'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                )}
              </div>

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
