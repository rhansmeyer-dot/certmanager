/**
 * OLIVER + DORA — Kandidaten-Portal
 * Erstes Login → Onboarding (Fragenkatalog + Dokument-Upload)
 * Weitere Logins → Status-Dashboard
 */
import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Scale, CheckCircle, FileText, Upload, Clock, AlertCircle,
  ChevronRight, ChevronLeft, User, MapPin, BookOpen, Folder,
} from 'lucide-react'
import { api } from '@/lib/api'

// ── Dokument-Definitionen pro Typ ──────────────────────────────────────────
const DOC_CONFIG: Record<string, { label: string; hint: string; required: boolean }> = {
  cv:                   { label: 'Lebenslauf (tabellarisch, auf Deutsch)', hint: 'Mit Angaben zu Eltern, Familienstand, Foto', required: true },
  language_certificate: { label: 'Deutschzertifikat (C1 oder höher)', hint: 'z.B. telc, Goethe, TestDaF', required: true },
  apostille:            { label: 'Ausländische Zeugnisse mit Apostille', hint: 'Alle Hochschulabschlüsse aus dem Heimatland', required: true },
  sample_translation:   { label: 'Probeübersetzungen (Portfolio)', hint: '3–5 Beispielübersetzungen in beide Richtungen', required: false },
  embassy_letter:       { label: 'Empfehlungsschreiben (z.B. Botschaft)', hint: 'Hilfreich für Brandenburg und andere BL', required: false },
  other:                { label: 'Sonstige Unterlagen', hint: 'Alles weitere was relevant sein könnte', required: false },
}

const STATUS_COLORS: Record<string, string> = {
  received:         'bg-green-100 text-green-700 border-green-200',
  requested:        'bg-yellow-100 text-yellow-700 border-yellow-200',
  missing_critical: 'bg-red-100 text-red-700 border-red-200',
  not_required:     'bg-gray-100 text-gray-500 border-gray-200',
}

const RESIDENCE_PERMITS = [
  'Deutsche Staatsbürgerschaft',
  'Niederlassungserlaubnis (unbefristet)',
  'Aufenthaltserlaubnis §18b (Fachkräfte)',
  'Aufenthaltserlaubnis §16b (Studium)',
  'Aufenthaltserlaubnis §25 (Humanitär)',
  'Blaue Karte EU',
  'EU-Freizügigkeit',
  'Anderes',
]

// ── Onboarding Schritte ───────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  { id: 1, icon: User,      title: 'Persönliche Daten',    sub: 'Bestätigen und ergänzen' },
  { id: 2, icon: BookOpen,  title: 'Qualifikation',         sub: 'Ausbildung und Erfahrung' },
  { id: 3, icon: Folder,    title: 'Dokumente',             sub: 'Status und Upload' },
  { id: 4, icon: CheckCircle, title: 'Abschluss',           sub: 'Alles bestätigen' },
]

function Field({ label, required, children, hint }: any) {
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

function Input({ value, onChange, placeholder, type = 'text' }: any) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
  )
}

function Select({ value, onChange, options, placeholder }: any) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
      <option value="">{placeholder || '— bitte wählen —'}</option>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

// ── Dokument-Upload-Block ─────────────────────────────────────────────────
function DocUploadBlock({ candidateId, token, docType, config, existing, onUpdate }: any) {
  const [uploading, setUploading] = useState(false)
  const [localStatus, setLocalStatus] = useState<string>(existing?.status || 'missing_critical')
  const [localFile, setLocalFile] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('docType', docType)
      await api.post(`/portal/${candidateId}/${token}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setLocalFile(file.name)
      setLocalStatus('received')
      onUpdate(docType, 'received')
    } catch (e) {
      alert('Upload fehlgeschlagen — bitte nochmal versuchen')
    } finally {
      setUploading(false)
    }
  }

  const isReceived = localStatus === 'received' || localFile

  return (
    <div className={`border rounded-xl p-4 ${isReceived ? 'border-green-200 bg-green-50' : config.required ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base">{isReceived ? '✅' : config.required ? '📎' : '📋'}</span>
            <span className="text-sm font-medium text-gray-800">{config.label}</span>
            {config.required && !isReceived && <span className="text-xs text-orange-600 font-medium">Pflicht</span>}
            {!config.required && <span className="text-xs text-gray-400">Optional</span>}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 ml-7">{config.hint}</p>
          {localFile && <p className="text-xs text-green-700 mt-1 ml-7">✓ {localFile} hochgeladen</p>}
        </div>
        <div className="flex-shrink-0">
          {isReceived ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Erhalten</span>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-3 h-3" />
              {uploading ? 'Lädt…' : 'Hochladen'}
            </button>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" onChange={handleUpload} className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />

      {/* Deklaration wenn noch kein Upload */}
      {!isReceived && (
        <div className="mt-3 flex gap-2 flex-wrap">
          <button
            onClick={() => { setLocalStatus('requested'); onUpdate(docType, 'requested') }}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${localStatus === 'requested' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
          >
            ⏳ Kommt in Kürze
          </button>
          {!config.required && (
            <button
              onClick={() => { setLocalStatus('not_required'); onUpdate(docType, 'not_required') }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${localStatus === 'not_required' ? 'bg-gray-100 border-gray-300 text-gray-600' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
            >
              — Nicht vorhanden
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Status-Dashboard (nach Onboarding) ────────────────────────────────────
function StatusDashboard({ profile, candidateId, token }: any) {
  const signed = profile.contract?.status === 'signed'
  const [sigName, setSigName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [doneSigning, setDoneSigning] = useState(false)

  const signMutation = useMutation({
    mutationFn: () => api.post(`/portal/${candidateId}/${token}/sign`, { signatureName: sigName, agreeToTerms: agreed }).then(r => r.data),
    onSuccess: () => setDoneSigning(true),
  })

  const PIPELINE = [
    { status: 'identified',               label: 'Bewerbung eingegangen' },
    { status: 'analyzed',                 label: 'Erstgespräch geführt' },
    { status: 'outline_sent',             label: 'Angebot erhalten' },
    { status: 'contract_sent',            label: 'Vertrag erhalten' },
    { status: 'contract_signed',          label: 'Vertrag unterzeichnet ✅' },
    { status: 'certification_in_progress', label: 'Antrag beim Gericht' },
    { status: 'certified',               label: 'Ermächtigung erhalten 🎉' },
  ]
  const STATUSES = PIPELINE.map(p => p.status)
  const currentIdx = STATUSES.indexOf(profile.status)

  // Persist a document status change (declaration buttons); uploads persist via /upload themselves.
  async function persistDoc(docType: string, status: string) {
    try {
      await api.post(`/portal/${candidateId}/${token}/document-status`, { documentType: docType, status })
    } catch { /* non-blocking */ }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Willkommen zurück, {profile.firstName}!</h2>
        <p className="text-sm text-gray-500">{profile.languagePair}{profile.bundesland ? ` · ${profile.bundesland.name}` : ''}</p>
      </div>

      {/* Fortschritt */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Ihr Fortschritt</h3>
        <div className="space-y-2">
          {PIPELINE.map(({ status, label }, i) => {
            const stepIdx = STATUSES.indexOf(status)
            const isDone  = stepIdx <= currentIdx
            const isCurrent = stepIdx === currentIdx
            return (
              <div key={status} className={`flex items-center gap-2 text-sm ${isDone ? 'text-gray-800' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${isDone ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={isCurrent ? 'font-semibold text-blue-700' : ''}>{label}</span>
                {isCurrent && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full ml-1">← Aktuell</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Vertrag unterschreiben (wenn contract_sent) */}
      {profile.status === 'contract_sent' && !signed && !doneSigning && (
        <div className="bg-white rounded-2xl shadow-sm border border-blue-200 p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Kooperationsvertrag unterzeichnen
          </h3>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 max-h-64 overflow-y-auto mb-4 space-y-2">
            <p className="font-semibold">Kooperationsvertrag speak2 – Übersetzer/in</p>
            <p><b>§1</b> speak2 übernimmt die Ermächtigungskosten beim {profile.bundesland?.court || 'zuständigen Gericht'}.</p>
            <p><b>§2 Vergütung:</b> 75% des Auftragswerts bei Dolmetschen, Festpreise bei Übersetzungen (mind. 10€/Auftrag).</p>
            <p><b>§3 Laufzeit:</b> 4 Jahre. Danach kündbar mit 3 Monaten Frist zum Jahresende.</p>
            <p><b>§4</b> Bei vorzeitiger Kündigung: anteilige Rückzahlung der Investition (degressiv über 4 Jahre).</p>
            <p><b>§5 Datenschutz:</b> Alle Informationen werden vertraulich behandelt.</p>
          </div>
          <label className="flex items-start gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 rounded text-blue-600" />
            <span className="text-sm text-gray-700">Ich habe den Vertrag gelesen und bin damit einverstanden.</span>
          </label>
          <Field label="Vollständiger Name als digitale Unterschrift">
            <Input value={sigName} onChange={setSigName} placeholder={`${profile.firstName} ${profile.lastName}`} />
          </Field>
          <button
            onClick={() => signMutation.mutate()}
            disabled={!agreed || !sigName.trim() || signMutation.isPending}
            className="w-full mt-3 bg-blue-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {signMutation.isPending ? 'Wird übermittelt…' : '✍️ Jetzt unterschreiben'}
          </button>
        </div>
      )}

      {(signed || doneSigning) && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="font-semibold text-green-900">Vertrag unterzeichnet!</p>
          <p className="text-sm text-green-700 mt-1">Wir melden uns in Kürze mit den nächsten Schritten.</p>
        </div>
      )}

      {/* Dokumente */}
      {profile.documentChecklist?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Folder className="w-4 h-4 text-blue-600" />
            Ihre Unterlagen
          </h3>
          <p className="text-xs text-gray-500 mb-3">Laden Sie hier Ihre Dokumente hoch — das ist jederzeit möglich, auch nach dem Onboarding.</p>
          <div className="space-y-2">
            {profile.documentChecklist.map((d: any) => (
              <DocUploadBlock
                key={d.id}
                candidateId={candidateId}
                token={token}
                docType={d.documentType}
                config={DOC_CONFIG[d.documentType] || { label: d.documentType, hint: '', required: false }}
                existing={d}
                onUpdate={persistDoc}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Fragen? <a href="mailto:info@speak2.de" className="text-blue-600 underline">info@speak2.de</a>
          </p>
        </div>
      )}
    </div>
  )
}

// ── Onboarding Flow ────────────────────────────────────────────────────────
function OnboardingFlow({ profile, candidateId, token }: any) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [docStatuses, setDocStatuses] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    phone:            profile.phone || '',
    fullAddress:      '',
    dateOfBirth:      '',
    residencePermit:  '',
    educationLevel:   profile.educationLevel || '',
    hasTranslationExp: profile.hasTranslationExp || false,
    translationYears: '',
    additionalInfo:   '',
  })

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/portal/${candidateId}/${token}/onboarding`, {
      ...form,
      documentDeclarations: docStatuses,
    }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal', candidateId, token] }),
  })

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }
  function updateDoc(docType: string, status: string) {
    setDocStatuses(s => ({ ...s, [docType]: status }))
  }

  // Welche Dokumente sind Pflicht für dieses Bundesland?
  const requiredDocs = Object.entries(DOC_CONFIG).filter(([, c]) => c.required)
  const optionalDocs = Object.entries(DOC_CONFIG).filter(([, c]) => !c.required)

  return (
    <div>
      {/* Fortschrittsbalken */}
      <div className="flex items-center gap-2 mb-6">
        {ONBOARDING_STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                step === s.id ? 'bg-blue-600 text-white' :
                step > s.id  ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {step > s.id ? '✓' : <Icon className="w-4 h-4" />}
              </div>
              {i < ONBOARDING_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-0.5">{ONBOARDING_STEPS[step-1].title}</h2>
        <p className="text-sm text-gray-500 mb-5">{ONBOARDING_STEPS[step-1].sub}</p>

        {/* Schritt 1: Persönliche Daten */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800 mb-2">
              Wir haben folgendes bereits gespeichert: <strong>{profile.firstName} {profile.lastName}</strong>,
              {profile.nativeLanguage && ` ${profile.nativeLanguage}`}
              {profile.deutschLevel && `, Deutsch ${profile.deutschLevel}`}.
              Bitte ergänzen Sie die fehlenden Angaben.
            </div>
            <Field label="Telefonnummer" hint="Für Rückfragen und Terminabsprachen">
              <Input value={form.phone} onChange={(v: string) => set('phone', v)} placeholder="+49 171 1234567" />
            </Field>
            <Field label="Vollständige Adresse" required hint="Straße, Hausnummer, PLZ, Stadt">
              <textarea value={form.fullAddress} onChange={e => set('fullAddress', e.target.value)} rows={2}
                placeholder={"Musterstraße 1\n12345 Musterstadt"}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <Field label="Geburtsdatum" required>
              <Input value={form.dateOfBirth} onChange={(v: string) => set('dateOfBirth', v)} type="date" />
            </Field>
            <Field label="Aufenthaltstitel / Staatsbürgerschaft" required hint="Wichtig für die Beurteilung des Weges">
              <Select value={form.residencePermit} onChange={(v: string) => set('residencePermit', v)} options={RESIDENCE_PERMITS} />
            </Field>
          </div>
        )}

        {/* Schritt 2: Qualifikation */}
        {step === 2 && (
          <div className="space-y-4">
            <Field label="Vollständige Ausbildung / Abschlüsse" required hint="Alle Abschlüsse, Land, Jahr (z.B. Master Germanistik, Usbekistan, 2018)">
              <textarea value={form.educationLevel} onChange={e => set('educationLevel', e.target.value)} rows={4}
                placeholder={`z.B.:\n• Master Germanistik, Nationale Universität Taschkent, 2018\n• Bachelor Lehramt Mathematik, Uni Andijan, 2015\n• Abitur Usbekistan, 2012 (Note 1,2)`}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <Field label="Übersetzungserfahrung">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.hasTranslationExp} onChange={e => set('hasTranslationExp', e.target.checked)} className="rounded text-blue-600" />
                  <span className="text-sm">Ja, ich habe als Übersetzer/Dolmetscher gearbeitet</span>
                </label>
                {form.hasTranslationExp && (
                  <Field label="Wie viele Jahre?">
                    <Input value={form.translationYears} onChange={(v: string) => set('translationYears', v)} type="number" placeholder="z.B. 3" />
                  </Field>
                )}
              </div>
            </Field>
            <Field label="Sonstige relevante Angaben" hint="z.B. Deutschkurse, Sprachkenntnisse, besondere Qualifikationen">
              <textarea value={form.additionalInfo} onChange={e => set('additionalInfo', e.target.value)} rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional..." />
            </Field>
          </div>
        )}

        {/* Schritt 3: Dokumente */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-2">
              <strong>Wichtig:</strong> Laden Sie hoch was Sie haben. Was noch fehlt, können Sie als „Kommt in Kürze" markieren.
              Führungszeugnis (Belegart 0): Das beantragen Sie selbst — es wird direkt vom Amt ans Gericht geschickt.
            </div>

            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Pflichtunterlagen</h4>
            {requiredDocs.map(([docType, config]) => (
              <DocUploadBlock
                key={docType}
                candidateId={candidateId}
                token={token}
                docType={docType}
                config={config}
                existing={null}
                onUpdate={updateDoc}
              />
            ))}

            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4">Optionale Unterlagen</h4>
            {optionalDocs.map(([docType, config]) => (
              <DocUploadBlock
                key={docType}
                candidateId={candidateId}
                token={token}
                docType={docType}
                config={config}
                existing={null}
                onUpdate={updateDoc}
              />
            ))}
          </div>
        )}

        {/* Schritt 4: Abschluss */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              <p className="font-semibold mb-2">✅ Fast fertig!</p>
              <p>Mit dem Absenden bestätigen Sie, dass alle Angaben korrekt sind. speak2 wird Ihre Unterlagen prüfen und sich melden.</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
              <p className="font-medium text-gray-700 mb-2">Ihre Angaben im Überblick:</p>
              <p>📍 {form.fullAddress || 'Adresse: —'}</p>
              <p>🎂 {form.dateOfBirth || 'Geburtsdatum: —'}</p>
              <p>🪪 {form.residencePermit || 'Aufenthaltstitel: —'}</p>
              <p>📚 {form.educationLevel?.slice(0, 80) || 'Ausbildung: —'}</p>
              <p>📋 {Object.keys(docStatuses).length} Dokumente deklariert</p>
            </div>

            <button
              onClick={() => submitMutation.mutate()}
              disabled={!form.fullAddress || !form.dateOfBirth || !form.residencePermit || !form.educationLevel || submitMutation.isPending}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {submitMutation.isPending ? 'Wird übermittelt…' : '✅ Profil abschicken'}
            </button>
            {submitMutation.isError && (
              <p className="text-sm text-red-600 text-center">Fehler — bitte nochmal versuchen</p>
            )}
          </div>
        )}

        {/* Navigation */}
        {(() => {
          const step1Valid = !!(form.fullAddress.trim() && form.dateOfBirth && form.residencePermit)
          const step2Valid = !!form.educationLevel.trim()
          const canAdvance = step === 1 ? step1Valid : step === 2 ? step2Valid : true
          return (
            <>
              {!canAdvance && (
                <p className="text-xs text-orange-600 mt-4 -mb-2">Bitte füllen Sie zuerst die Pflichtfelder (*) aus.</p>
              )}
              <div className="flex gap-3 mt-6">
                {step > 1 && (
                  <button onClick={() => setStep(s => s - 1)}
                    className="flex items-center gap-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4" /> Zurück
                  </button>
                )}
                <div className="flex-1" />
                {step < 4 && (
                  <button onClick={() => canAdvance && setStep(s => s + 1)} disabled={!canAdvance}
                    className="flex items-center gap-1 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    Weiter <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}

// ── Haupt-Portal-Seite ─────────────────────────────────────────────────────
export default function PortalPage() {
  const { candidateId, token } = useParams<{ candidateId: string; token: string }>()

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['portal', candidateId, token],
    queryFn: () => api.get(`/portal/${candidateId}/${token}`).then(r => r.data),
    retry: false,
  })

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  if (error || !profile) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow-sm">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h1 className="font-bold text-gray-900 mb-2">Link nicht gefunden</h1>
        <p className="text-sm text-gray-600 mb-4">
          Dieser Link ist möglicherweise abgelaufen oder wurde bereits verwendet.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-600 space-y-2">
          <p>💡 <strong>Was Sie tun können:</strong></p>
          <p>• Prüfen Sie ob Sie den vollständigen Link aus der E-Mail kopiert haben</p>
          <p>• Bitten Sie speak2 um einen neuen Zugangslink</p>
        </div>
        <a href="mailto:info@speak2.de?subject=Neuer%20Portal-Zugang%20benötigt"
          className="mt-4 block w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors">
          ✉️ Neuen Link anfordern
        </a>
        <p className="text-xs text-gray-400 mt-3">speak2 · info@speak2.de</p>
      </div>
    </div>
  )

  const isFirstLogin = !profile.onboardingCompletedAt

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">speak2</p>
            <p className="text-xs text-gray-500">{isFirstLogin ? 'Willkommen!' : 'Ihr Bereich'}</p>
          </div>
        </div>

        {/* Erstes Login → Onboarding */}
        {isFirstLogin ? (
          <>
            <div className="bg-blue-600 text-white rounded-2xl p-5 mb-4">
              <h1 className="text-xl font-bold mb-1">Herzlich Willkommen, {profile.firstName}!</h1>
              <p className="text-blue-100 text-sm">
                Bitte nehmen Sie sich 5 Minuten Zeit um Ihr Profil zu vervollständigen.
                Wir benötigen diese Angaben um Ihren Weg zur Ermächtigung optimal zu planen.
              </p>
            </div>
            <OnboardingFlow profile={profile} candidateId={candidateId} token={token} />
          </>
        ) : (
          <StatusDashboard profile={profile} candidateId={candidateId} token={token} />
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          speak2 · Paderborn · <a href="mailto:info@speak2.de" className="underline">info@speak2.de</a>
          <br />
          <a href="/impressum" className="underline">Impressum</a> · <a href="/datenschutz" className="underline">Datenschutz</a>
        </p>
      </div>
    </div>
  )
}
