import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { KeyRound, Link2, Copy, Check, ShieldCheck, Clock } from 'lucide-react'
import { authApi } from '@/lib/api'
import { formatRelative } from '@/lib/utils'

export default function TeamPage() {
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['team-users'],
    queryFn: authApi.users,
  })

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Kein Zugriff. Diese Seite ist nur für Administratoren.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Team &amp; Zugänge</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Nutzerkonten verwalten. Wenn jemand sein Passwort vergessen hat, erzeugen Sie hier einen
        Reset-Link zum Weitergeben — oder setzen direkt ein neues Passwort.
      </p>

      {isLoading ? (
        <p className="text-sm text-gray-400">Wird geladen…</p>
      ) : (
        <div className="space-y-3">
          {users.map((u: any) => <UserRow key={u.id} user={u} />)}
        </div>
      )}
    </div>
  )
}

function UserRow({ user }: { user: any }) {
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [showSetPw, setShowSetPw] = useState(false)
  const [pw, setPw] = useState('')
  const [pwDone, setPwDone] = useState(false)

  const linkMutation = useMutation({
    mutationFn: () => authApi.resetLink(user.id),
    onSuccess: (d) => { setLink(d.resetUrl); setCopied(false) },
  })
  const setPwMutation = useMutation({
    mutationFn: () => authApi.setPassword(user.id, pw),
    onSuccess: () => { setPwDone(true); setPw(''); setTimeout(() => { setShowSetPw(false); setPwDone(false) }, 2500) },
  })

  function copy() {
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{user.fullName}</p>
            {user.role === 'admin' && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Admin
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {user.lastLoginAt ? `Zuletzt angemeldet ${formatRelative(user.lastLoginAt)}` : 'Noch nie angemeldet'}
            {' · '}{user.hasPassword ? 'Passwort gesetzt' : 'kein Passwort'}
          </p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => linkMutation.mutate()}
            disabled={linkMutation.isPending}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Link2 className="w-3.5 h-3.5" />
            {linkMutation.isPending ? '…' : 'Reset-Link erzeugen'}
          </button>
          <button
            onClick={() => setShowSetPw(v => !v)}
            className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-50"
          >
            Passwort direkt setzen
          </button>
        </div>
      </div>

      {link && (
        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-800 mb-1 font-medium">Reset-Link (1 Stunde gültig) — an {user.fullName} weitergeben:</p>
          <div className="flex items-center gap-2">
            <input readOnly value={link} className="flex-1 text-xs bg-white border border-blue-200 rounded px-2 py-1.5 text-gray-700" />
            <button onClick={copy} className="text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded flex items-center gap-1 hover:bg-blue-700">
              {copied ? <><Check className="w-3.5 h-3.5" />Kopiert</> : <><Copy className="w-3.5 h-3.5" />Kopieren</>}
            </button>
          </div>
        </div>
      )}

      {showSetPw && (
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
          {pwDone ? (
            <p className="text-sm text-green-700 flex items-center gap-1.5"><Check className="w-4 h-4" />Passwort gesetzt.</p>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text" value={pw} onChange={e => setPw(e.target.value)}
                placeholder="Neues Passwort (min. 8 Zeichen)"
                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setPwMutation.mutate()}
                disabled={pw.length < 8 || setPwMutation.isPending}
                className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded font-medium hover:bg-gray-900 disabled:opacity-40"
              >
                {setPwMutation.isPending ? '…' : 'Setzen'}
              </button>
            </div>
          )}
          {setPwMutation.isError && <p className="text-xs text-red-600 mt-1">Fehlgeschlagen.</p>}
        </div>
      )}
    </div>
  )
}
