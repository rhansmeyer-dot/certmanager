import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Globe, Phone, Mail, User, ChevronRight, Sparkles, Send, Link2, FileText, CheckSquare, Printer } from 'lucide-react'
import { useState } from 'react'
import { candidatesApi, aiApi, portalApi, antonApi, documentsApi } from '@/lib/api'
import { STATUS_LABELS, STATUS_COLORS, DIFFICULTY_COLORS, DIFFICULTY_LABELS, cn, formatDate, formatRelative } from '@/lib/utils'

const NEXT_STATUS: Record<string, string> = {
  identified: 'analyzed',
  analyzed: 'outline_sent',
  outline_sent: 'contract_sent',
  contract_sent: 'contract_signed',
  contract_signed: 'certification_in_progress',
  certification_in_progress: 'certified',
}

const NEXT_ACTION_LABELS: Record<string, string> = {
  identified: 'Als analysiert markieren',
  analyzed: 'Outline senden',
  outline_sent: 'Vertrag senden',
  contract_sent: 'Als unterzeichnet markieren',
  contract_signed: 'Zertifizierung gestartet',
  certification_in_progress: 'Zertifizierung abgeschlossen ✓',
}

// ── ANTON Panel — Antragspaket ─────────────────────────────────────────────
function AntonPanel({ candidateId, status }: { candidateId: string; status: string }) {
  const queryClient = useQueryClient()
  const [showText, setShowText] = useState(false)

  const { data: pkg } = useQuery({
    queryKey: ['anton-package', candidateId],
    queryFn: () => antonApi.getPackage(candidateId),
    enabled: ['contract_signed', 'certification_in_progress'].includes(status),
  })

  const generateMutation = useMutation({
    mutationFn: () => antonApi.generate(candidateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['anton-package', candidateId] }),
  })

  const approveMutation = useMutation({
    mutationFn: () => antonApi.approve(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] })
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  if (!['contract_signed', 'certification_in_progress'].includes(status)) return null

  return (
    <div className="bg-white rounded-xl border border-orange-200 p-4">
      <h3 className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" />
        ANTON — Antragspaket
      </h3>

      {status === 'certification_in_progress' ? (
        <div className="text-center py-2">
          <div className="flex items-center gap-1.5 justify-center text-green-700 text-sm font-medium">
            <CheckSquare className="w-4 h-4" />
            Antrag eingereicht — MAX überwacht
          </div>
          <p className="text-xs text-gray-400 mt-1">Alle-3-Wochen-Check läuft automatisch</p>
        </div>
      ) : pkg?.hasPackage ? (
        <div className="space-y-2">
          <div className="bg-orange-50 rounded-lg p-2 text-xs text-orange-800">
            ✅ Antragspaket generiert — bereit zur Freigabe
          </div>
          <button
            onClick={() => setShowText(!showText)}
            className="w-full text-xs text-gray-500 hover:text-gray-700"
          >
            {showText ? '▲ Anschreiben ausblenden' : '▼ Anschreiben prüfen'}
          </button>
          {showText && pkg.anschreiben && (
            <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans">
              {pkg.anschreiben}
            </pre>
          )}
          <button
            onClick={() => {
              if (window.confirm('Antragspaket freigeben?\n→ Diana-Task (Drucken+Senden)\n→ MAX-Monitor (alle 3 Wochen)\n→ Status: Zertifizierung läuft')) {
                approveMutation.mutate()
              }
            }}
            disabled={approveMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            {approveMutation.isPending ? 'Wird freigegeben…' : 'Freigeben → Diana + MAX'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium py-2 rounded-lg hover:bg-orange-100 disabled:opacity-50 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          {generateMutation.isPending ? 'ANTON generiert…' : 'Antragspaket generieren'}
        </button>
      )}
    </div>
  )
}

// ── Portal-Link Komponente ─────────────────────────────────────────────────
function PortalLinkPanel({ candidateId }: { candidateId: string }) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  async function copyLink() {
    setLoading(true)
    try {
      const data = await portalApi.getToken(candidateId)
      await navigator.clipboard.writeText(data.portalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Link2 className="w-3.5 h-3.5 text-purple-500" />
        Kandidaten-Portal
      </h3>
      <button
        onClick={copyLink}
        disabled={loading}
        className="w-full text-sm py-2 rounded-lg border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors disabled:opacity-50"
      >
        {loading ? 'Wird generiert…' : copied ? '✓ Link kopiert!' : '🔗 Portal-Link kopieren'}
      </button>
      <p className="text-xs text-gray-400 mt-1.5 text-center">Link per E-Mail/WhatsApp an Kandidaten schicken</p>
    </div>
  )
}

// ── KI-Update Komponente ───────────────────────────────────────────────────
function AiUpdatePanel({ candidateId }: { candidateId: string }) {
  const [message, setMessage] = useState('')
  const [queued, setQueued] = useState(false)

  const queueMutation = useMutation({
    mutationFn: (msg: string) => aiApi.update(candidateId, msg),
    onSuccess: () => {
      setQueued(true)
      setMessage('')
      setTimeout(() => setQueued(false), 4000)
    },
  })

  function handleSend() {
    if (!message.trim()) return
    queueMutation.mutate(message.trim())
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
        Update einreichen
      </h3>

      {queued ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 text-center">
          ✓ Eingereicht — Ramón verarbeitet es beim nächsten Chat-Besuch
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend() }}
            rows={3}
            placeholder={'Was ist passiert?\nz.B. „Juraev hat heute angerufen, ABH hat grünes Licht gegeben."'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || queueMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {queueMutation.isPending ? (
              <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Wird gespeichert…</>
            ) : (
              <><Send className="w-3.5 h-3.5" /> Einreichen</>
            )}
          </button>
          {queueMutation.isError && (
            <p className="text-xs text-red-600">Fehler — ist der API-Server aktiv?</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => candidatesApi.get(id!),
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      candidatesApi.updateStatus(id!, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] })
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!candidate) return <div>Kandidat nicht gefunden</div>

  const nextStatus = NEXT_STATUS[candidate.status]
  const nextActionLabel = NEXT_ACTION_LABELS[candidate.status]
  const receivedDocs = candidate.documentChecklist?.filter((d: any) => d.status === 'received').length || 0
  const totalDocs = candidate.documentChecklist?.length || 0

  return (
    <div className="max-w-6xl">
      {/* Back */}
      <button
        onClick={() => navigate('/candidates')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück zur Pipeline
      </button>

      <div className="grid grid-cols-4 gap-6">
        {/* Identity Panel */}
        <div className="col-span-1 space-y-4">
          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-blue-700">
                {candidate.firstName[0]}{candidate.lastName[0]}
              </span>
            </div>

            <h2 className="font-bold text-gray-900">{candidate.firstName} {candidate.lastName}</h2>
            <p className="text-sm text-gray-500 mb-1">{candidate.candidateRef}</p>

            {/* Language */}
            <div className="flex items-center gap-1.5 mt-3 mb-1">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm text-gray-700">{candidate.languagePair}</span>
            </div>

            {/* Location */}
            {(candidate.currentCity || candidate.bundesland) && (
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-700">
                  {candidate.currentCity}{candidate.currentCity && candidate.bundesland ? ', ' : ''}
                  {candidate.bundesland?.bundeslandName}
                </span>
              </div>
            )}

            {/* Contact */}
            {candidate.phone && (
              <div className="flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-700">{candidate.phone}</span>
              </div>
            )}
            {candidate.email && (
              <div className="flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <a href={`mailto:${candidate.email}`} className="text-sm text-blue-600 hover:underline">{candidate.email}</a>
              </div>
            )}

            {/* Assigned to */}
            {candidate.assignedTo && (
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">Zuständig: {candidate.assignedTo.fullName}</span>
              </div>
            )}
          </div>

          {/* Current Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stadium</h3>
            <span className={cn('text-sm font-semibold px-2.5 py-1.5 rounded-lg', STATUS_COLORS[candidate.status])}>
              {STATUS_LABELS[candidate.status]}
            </span>

            {candidate.bundesland && (
              <div className="mt-3">
                <span className={cn('text-xs px-2 py-1 rounded', DIFFICULTY_COLORS[candidate.bundesland.difficulty])}>
                  {candidate.bundesland.bundeslandName}: {DIFFICULTY_LABELS[candidate.bundesland.difficulty]}
                </span>
              </div>
            )}

            {/* Document progress */}
            {totalDocs > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Dokumente</span>
                  <span>{receivedDocs}/{totalDocs}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${totalDocs > 0 ? (receivedDocs / totalDocs) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Next Actions */}
          {nextStatus && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Nächste Aktion</h3>
              <button
                onClick={() => {
                  if (window.confirm(`Stadium auf "${STATUS_LABELS[nextStatus]}" setzen?`)) {
                    statusMutation.mutate({ status: nextStatus })
                  }
                }}
                disabled={statusMutation.isPending}
                className="w-full flex items-center justify-between bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <span>{nextActionLabel}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ANTON — Antragspaket */}
          <AntonPanel candidateId={id!} status={candidate.status} />

          {/* Portal-Link */}
          <PortalLinkPanel candidateId={id!} />

          {/* KI-Update */}
          <AiUpdatePanel candidateId={id!} />
        </div>

        {/* Main Content */}
        <div className="col-span-3 space-y-4">
          {/* Pipeline Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Pipeline-Verlauf</h3>
            <div className="space-y-2">
              {candidate.pipelineEvents?.map((event: any) => (
                <div key={event.id} className="flex items-start gap-3 text-sm">
                  <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">
                    {formatRelative(event.createdAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    {event.fromStatus && (
                      <>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', STATUS_COLORS[event.fromStatus])}>
                          {STATUS_LABELS[event.fromStatus]}
                        </span>
                        <span className="text-gray-400">→</span>
                      </>
                    )}
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[event.toStatus])}>
                      {STATUS_LABELS[event.toStatus]}
                    </span>
                    {event.triggeredBy && (
                      <span className="text-xs text-gray-400">({event.triggeredBy.fullName})</span>
                    )}
                  </div>
                  {event.notes && <span className="text-xs text-gray-500 italic">{event.notes}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Document Checklist */}
          {candidate.documentChecklist?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Dokumente</h3>
              <div className="space-y-1.5">
                {candidate.documentChecklist.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm', {
                        'text-green-500': item.status === 'received',
                        'text-red-500': item.status === 'missing_critical',
                        'text-amber-500': item.status === 'requested',
                        'text-gray-300': item.status === 'not_required',
                      })}>
                        {item.status === 'received' ? '✅' : item.status === 'missing_critical' ? '🔴' : item.status === 'requested' ? '⚠️' : '–'}
                      </span>
                      <span className="text-sm text-gray-700 capitalize">{item.documentType.replace(/_/g, ' ')}</span>
                    </div>
                    {item.receivedAt && (
                      <span className="text-xs text-gray-400">{formatDate(item.receivedAt)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded files (from candidate portal → Supabase Storage) */}
          {candidate.documents?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Hochgeladene Dateien ({candidate.documents.length})</h3>
              <div className="space-y-1.5">
                {candidate.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{doc.displayName}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 capitalize">{doc.documentType.replace(/_/g, ' ')}</span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const url = await documentsApi.downloadUrl(doc.id)
                          if (url) window.open(url, '_blank', 'noopener')
                        } catch { alert('Datei konnte nicht geöffnet werden.') }
                      }}
                      className="text-xs text-blue-600 hover:underline flex-shrink-0 whitespace-nowrap"
                    >
                      Öffnen ↗
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {candidate.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Notizen</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{candidate.notes}</p>
            </div>
          )}

          {/* Bundesland Info */}
          {candidate.bundesland && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Rechtslage: {candidate.bundesland.bundeslandName}
              </h3>
              {candidate.bundesland.courtName && (
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Gericht:</span> {candidate.bundesland.courtName}
                </p>
              )}
              {candidate.bundesland.legalBasisCitation && (
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Rechtsgrundlage:</span> {candidate.bundesland.legalBasisCitation}
                </p>
              )}
              {candidate.bundesland.estimatedDurationDays && (
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Erwartete Dauer:</span> ca. {Math.round(candidate.bundesland.estimatedDurationDays / 7)} Wochen
                </p>
              )}
              {candidate.bundesland.typicalCostMin && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Kosten:</span> {candidate.bundesland.typicalCostMin}–{candidate.bundesland.typicalCostMax} €
                </p>
              )}
              {candidate.bundesland.specialNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                  <p className="text-xs text-amber-800">{candidate.bundesland.specialNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
