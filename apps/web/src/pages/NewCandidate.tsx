import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { candidatesApi, bundeslandApi } from '@/lib/api'

export default function NewCandidatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: bundeslaender = [] } = useQuery({ queryKey: ['bundesland'], queryFn: bundeslandApi.list })

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nativeLanguage: '',
    languagePair: '',
    countryOfOrigin: '',
    currentCity: '',
    bundeslandId: '',
    deutschLevel: '',
    educationLevel: '',
    hasTranslationExp: false,
    source: '',
    notes: '',
  })

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      candidatesApi.create({
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
        countryOfOrigin: data.countryOfOrigin || undefined,
        currentCity: data.currentCity || undefined,
        bundeslandId: data.bundeslandId || undefined,
        deutschLevel: data.deutschLevel || undefined,
        educationLevel: data.educationLevel || undefined,
        source: data.source || undefined,
        notes: data.notes || undefined,
        languagePair: data.languagePair || `${data.nativeLanguage} ↔ Deutsch`,
      }),
    onSuccess: (candidate) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigate(`/candidates/${candidate.id}`)
    },
  })

  function set(field: string, value: any) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate('/candidates')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Neuer Kandidat</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Izzatillo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Juraev"
              />
            </div>
          </div>

          {/* Language */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Muttersprache *</label>
              <input
                type="text"
                value={form.nativeLanguage}
                onChange={e => {
                  set('nativeLanguage', e.target.value)
                  if (!form.languagePair) set('languagePair', `${e.target.value} ↔ Deutsch`)
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Usbekisch"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sprachpaar</label>
              <input
                type="text"
                value={form.languagePair}
                onChange={e => set('languagePair', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Usbekisch ↔ Deutsch"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+49 171 1234567"
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stadt / Wohnort</label>
              <input
                type="text"
                value={form.currentCity}
                onChange={e => set('currentCity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Berlin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bundesland</label>
              <select
                value={form.bundeslandId}
                onChange={e => set('bundeslandId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Bundesland wählen —</option>
                {bundeslaender.map((bl: any) => (
                  <option key={bl.id} value={bl.id}>
                    {bl.bundeslandCode} — {bl.bundeslandName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Qualifications */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deutschniveau</label>
              <select
                value={form.deutschLevel}
                onChange={e => set('deutschLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— wählen —</option>
                <option>A1</option><option>A2</option>
                <option>B1</option><option>B2</option>
                <option>C1</option><option>C2</option>
                <option>Muttersprache</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Herkunftsland</label>
              <input
                type="text"
                value={form.countryOfOrigin}
                onChange={e => set('countryOfOrigin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Usbekistan"
              />
            </div>
          </div>

          {/* Education & Experience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ausbildung / Abschluss</label>
            <input
              type="text"
              value={form.educationLevel}
              onChange={e => set('educationLevel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Master Germanistik, Universität Taschkent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="translationExp"
              checked={form.hasTranslationExp}
              onChange={e => set('hasTranslationExp', e.target.checked)}
              className="rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="translationExp" className="text-sm text-gray-700">
              Hat Übersetzungserfahrung
            </label>
          </div>

          {/* Source & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quelle / Herkunft</label>
              <input
                type="text"
                value={form.source}
                onChange={e => set('source', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="LinkedIn, Empfehlung, ..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Qualifikationen, Besonderheiten, nächste Schritte..."
            />
          </div>

          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              Fehler beim Speichern. Bitte Pflichtfelder prüfen.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/candidates')}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Speichern...' : 'Kandidat anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
