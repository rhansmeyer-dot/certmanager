import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { candidatesApi } from '@/lib/api'
import { STATUS_LABELS, STATUS_COLORS, DIFFICULTY_COLORS, cn, daysInStatus } from '@/lib/utils'

const PIPELINE_STAGES = [
  'identified', 'analyzed', 'outline_sent', 'contract_sent',
  'contract_signed', 'certification_in_progress', 'certified',
]

function CandidateRow({ candidate, onClick }: { candidate: any; onClick: () => void }) {
  const days = daysInStatus(candidate)
  const hasOverdueTask = candidate.tasks?.some((t: any) => new Date(t.dueAt) < new Date())
  const missingDocs = candidate.documentChecklist?.filter((d: any) => d.status === 'missing_critical').length || 0

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg border px-4 py-3 cursor-pointer hover:shadow-sm transition-all flex items-center gap-4',
        hasOverdueTask
          ? 'border-l-4 border-l-red-500 border-t-gray-200 border-r-gray-200 border-b-gray-200'
          : missingDocs > 0
          ? 'border-l-4 border-l-amber-400 border-t-gray-200 border-r-gray-200 border-b-gray-200'
          : 'border-gray-200 hover:border-blue-300',
      )}
    >
      {/* Name + Sprache */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {candidate.firstName} {candidate.lastName}
        </p>
        <p className="text-xs text-gray-500 truncate">{candidate.languagePair}</p>
        {hasOverdueTask && (
          <p className="text-xs text-red-600 mt-0.5 truncate">⏰ {candidate.tasks[0]?.title}</p>
        )}
        {missingDocs > 0 && !hasOverdueTask && (
          <p className="text-xs text-amber-600 mt-0.5">📋 {missingDocs} Dok. fehlt</p>
        )}
      </div>

      {/* Bundesland Badge */}
      {candidate.bundesland && (
        <span className={cn('text-xs px-2 py-0.5 rounded font-medium flex-shrink-0', DIFFICULTY_COLORS[candidate.bundesland.difficulty])}>
          {candidate.bundesland.bundeslandCode}
        </span>
      )}

      {/* Tage */}
      <span className="text-xs text-gray-400 flex-shrink-0 w-14 text-right">{days} Tage</span>

      {/* Zuständig */}
      {candidate.assignedTo ? (
        <span className="text-xs text-gray-400 flex-shrink-0 w-16 text-right truncate">
          {candidate.assignedTo.fullName.split(' ')[0]}
        </span>
      ) : (
        <span className="w-16 flex-shrink-0" />
      )}
    </div>
  )
}

export default function CandidatesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const statusFilter = searchParams.get('status')

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['candidates', statusFilter],
    queryFn: () => candidatesApi.list(statusFilter ? { status: statusFilter } : undefined),
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // Nach Status gruppieren
  const byStatus: Record<string, any[]> = {}
  PIPELINE_STAGES.forEach((s) => { byStatus[s] = [] })
  candidates.forEach((c: any) => {
    if (byStatus[c.status]) byStatus[c.status].push(c)
  })
  const dropped = candidates.filter((c: any) => c.status === 'dropped')

  // Wenn Statusfilter aktiv → einfache Liste
  if (statusFilter) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kandidaten</h1>
            <p className="text-sm text-gray-500">{candidates.length} · {STATUS_LABELS[statusFilter] ?? statusFilter}</p>
          </div>
          <button onClick={() => navigate('/candidates')} className="text-sm text-blue-600 hover:underline">← Alle anzeigen</button>
        </div>
        <div className="space-y-2">
          {candidates.map((c: any) => (
            <CandidateRow key={c.id} candidate={c} onClick={() => navigate(`/candidates/${c.id}`)} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kandidaten</h1>
          <p className="text-sm text-gray-500">{candidates.filter((c: any) => c.status !== 'dropped').length} aktiv</p>
        </div>
        <button
          onClick={() => navigate('/candidates/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Kandidat hinzufügen
        </button>
      </div>

      {/* Status-Gruppen — vertikal */}
      <div className="space-y-6">
        {PIPELINE_STAGES.map((status) => {
          const group = byStatus[status] ?? []
          if (group.length === 0) return null
          return (
            <div key={status}>
              {/* Gruppen-Header */}
              <div className="flex items-center gap-3 mb-2">
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', STATUS_COLORS[status])}>
                  {group.length}
                </span>
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {STATUS_LABELS[status]}
                </h2>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Kandidaten-Zeilen */}
              <div className="space-y-2">
                {group.map((candidate: any) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Inaktiv (dropped) — eingeklappt */}
        {dropped.length > 0 && (
          <div className="opacity-60">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                {dropped.length}
              </span>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Inaktiv</h2>
              <div className="flex-1 h-px bg-gray-100" />
              <button
                onClick={() => navigate('/candidates?status=dropped')}
                className="text-xs text-blue-500 hover:underline"
              >
                Anzeigen →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
