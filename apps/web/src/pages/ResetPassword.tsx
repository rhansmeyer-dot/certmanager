import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Scale, CheckCircle, MailCheck } from 'lucide-react'
import { authApi } from '@/lib/api'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">speak2</p>
              <p className="text-sm text-gray-500">CertManager</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">{children}</div>
        <p className="text-center text-xs text-gray-400 mt-4">speak2 CertManager — Internes System</p>
      </div>
    </div>
  )
}

// ── Passwort vergessen: Link anfordern ──────────────────────────────────────
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setDone(true)
    } catch {
      setDone(true) // generische Antwort — nie verraten, ob die Adresse existiert
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <Shell>
        <div className="text-center">
          <MailCheck className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Anfrage erhalten</h1>
          <p className="text-sm text-gray-600">
            Falls ein Konto zu dieser E-Mail existiert, wird ein Link zum Zurücksetzen zugestellt.
            Der Link ist eine Stunde gültig. Prüfen Sie ggf. auch Ihren Spam-Ordner.
          </p>
          <p className="text-xs text-gray-500 mt-3">
            Kommt nichts an? Wenden Sie sich an Ramón (info@speak2.de), er kann Ihnen direkt einen Link erstellen.
          </p>
          <Link to="/login" className="inline-block mt-5 text-sm text-blue-600 hover:underline">← Zurück zur Anmeldung</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Passwort vergessen</h1>
      <p className="text-sm text-gray-500 mb-6">
        Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link, mit dem Sie ein neues Passwort vergeben können.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="name@transcura.de"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="submit" disabled={loading || !email}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Wird gesendet…' : 'Link anfordern'}
        </button>
      </form>
      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm text-blue-600 hover:underline">← Zurück zur Anmeldung</Link>
      </div>
    </Shell>
  )
}

// ── Neues Passwort setzen (Link mit Token) ──────────────────────────────────
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (pw.length < 8) return setError('Das Passwort muss mindestens 8 Zeichen haben.')
    if (pw !== pw2) return setError('Die Passwörter stimmen nicht überein.')
    setLoading(true)
    try {
      await authApi.resetPassword(token, pw)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Zurücksetzen fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Ungültiger Link</h1>
        <p className="text-sm text-gray-600">Dieser Link enthält kein gültiges Token. Bitte fordern Sie einen neuen an.</p>
        <Link to="/forgot-password" className="inline-block mt-4 text-sm text-blue-600 hover:underline">Neuen Link anfordern</Link>
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell>
        <div className="text-center">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Passwort geändert</h1>
          <p className="text-sm text-gray-600">Sie werden zur Anmeldung weitergeleitet…</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Neues Passwort vergeben</h1>
      <p className="text-sm text-gray-500 mb-6">Wählen Sie ein neues Passwort (mindestens 8 Zeichen).</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Passwort wiederholen</label>
          <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Wird gespeichert…' : 'Passwort speichern'}
        </button>
      </form>
    </Shell>
  )
}
