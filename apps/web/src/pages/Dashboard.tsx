import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, Euro, Users, CheckCircle, TrendingUp, Bot, Phone, Printer } from 'lucide-react'
import { dashboardApi, authApi, aiApi, tasksApi } from '@/lib/api'
import { STATUS_LABELS, STATUS_COLORS, formatEur, formatRelative, cn } from '@/lib/utils'

const PIPELINE_ORDER = [
  'identified', 'analyzed', 'outline_sent', 'contract_sent',
  'contract_signed', 'certification_in_progress', 'certified',
]

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.me, staleTime: 5 * 60 * 1000 })
  const isThomas = me?.email === 'thomas@speak2.de'
  const isDiana = me?.email === 'diana@speak2.de'

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 60_000,
    enabled: !isThomas && !isDiana,
  })

  // KI-Queue für Ramon
  const { data: aiQueue = [] } = useQuery({
    queryKey: ['ai-queue'],
    queryFn: aiApi.queue,
    refetchInterval: 30_000,
    enabled: me?.role === 'admin',
  })

  // Thomas/Diana: ihre Tasks
  const { data: myTasks = [] } = useQuery({
    queryKey: ['my-tasks', me?.id],
    queryFn: () => tasksApi.list({ assignedToId: me?.id }),
    refetchInterval: 30_000,
    enabled: (isThomas || isDiana) && !!me?.id,
  })

  // Thomas-Dashboard
  if (isThomas) {
    const callTasks = myTasks.filter((t: any) => t.title?.includes('[THOMAS]') && t.status === 'pending')
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meine Anruf-Tasks</h1>
          <p className="text-sm text-gray-500">{callTasks.length} offen</p>
        </div>
        {callTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Keine offenen Anruf-Tasks.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {callTasks.map((task: any) => (
              <div key={task.id} onClick={() => task.candidateId && navigate(`/candidates/${task.candidateId}`)}
                className="bg-white rounded-xl border border-blue-200 p-4 cursor-pointer hover:border-blue-400 transition-colors">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{task.title?.replace('[THOMAS]', '').replace('📞', '').trim()}</p>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-1 whitespace-pre-line line-clamp-4">{task.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">Fällig: {new Date(task.dueAt).toLocaleDateString('de-DE')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">Nach dem Anruf:</p>
          <p>Gehe zum Kandidaten → „Update einreichen" → schreib was du erfahren hast → Ramón verarbeitet es.</p>
        </div>
      </div>
    )
  }

  // Diana-Dashboard
  if (isDiana) {
    const printTasks = myTasks.filter((t: any) => t.title?.includes('[DIANA]') && t.status === 'pending')
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meine Aufgaben</h1>
          <p className="text-sm text-gray-500">{printTasks.length} offen</p>
        </div>
        {printTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Keine offenen Aufgaben.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {printTasks.map((task: any) => (
              <div key={task.id} className="bg-white rounded-xl border border-green-200 p-4">
                <div className="flex items-start gap-3">
                  <Printer className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{task.title?.replace('[DIANA]', '').replace('🖨️', '').trim()}</p>
                    {task.description && (
                      <p className="text-xs text-gray-600 mt-2 whitespace-pre-line bg-gray-50 rounded-lg p-3">{task.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">Fällig: {new Date(task.dueAt).toLocaleDateString('de-DE')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const { pipeline = {}, urgentCandidates = [], financials = {}, recentActivity = [], pendingApprovals = [], overdueTasks = [] } = data || {}
  const totalActive = PIPELINE_ORDER.slice(0, -1).reduce((sum: number, s: string) => sum + (pipeline[s] || 0), 0)

  return (
    <div className="space-y-6">

      {/* KI-Queue Banner */}
      {aiQueue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Bot className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              🤖 {aiQueue.length} Mitarbeiter-Update{aiQueue.length > 1 ? 's' : ''} warten auf Verarbeitung
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {aiQueue.map((q: any) => `${q.candidate?.firstName} ${q.candidate?.lastName}`).join(', ')}
            </p>
          </div>
          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full font-medium">
            Schreib „neue updates?" im Chat
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Guten Morgen — {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/candidates?new=1')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Kandidat hinzufügen
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <Users className="w-4 h-4" />
            Aktive Kandidaten
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalActive}</p>
          <p className="text-xs text-gray-400 mt-1">{pipeline['certified'] || 0} zertifiziert</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <Euro className="w-4 h-4" />
            Investiert
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatEur(financials.totalInvested || 0)}</p>
          <p className="text-xs text-gray-400 mt-1">Gesamtinvestition</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <TrendingUp className="w-4 h-4" />
            Einnahmen
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatEur(financials.totalRevenue || 0)}</p>
          <p className="text-xs text-gray-400 mt-1">speak2-Anteil gesamt</p>
        </div>
        <div className={cn('bg-white rounded-xl border p-4', financials.netPosition >= 0 ? 'border-green-200' : 'border-red-200')}>
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <CheckCircle className="w-4 h-4" />
            Net-Position
          </div>
          <p className={cn('text-3xl font-bold', financials.netPosition >= 0 ? 'text-green-600' : 'text-red-600')}>
            {formatEur(financials.netPosition || 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Einnahmen − Investitionen</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Urgent Actions */}
        <div className="col-span-2 space-y-4">
          {/* Pending Approvals */}
          {pendingApprovals.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Zur Freigabe ({pendingApprovals.length})
              </h2>
              <div className="space-y-2">
                {pendingApprovals.map((approval: any) => (
                  <div
                    key={approval.id}
                    className="bg-white rounded-lg p-3 border border-amber-200 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{approval.subject}</p>
                      <p className="text-xs text-gray-500">
                        {approval.candidate?.firstName} {approval.candidate?.lastName} · von {approval.createdBy?.fullName}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/communications')}
                      className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Prüfen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Urgent Candidates */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Dringende Aktionen ({urgentCandidates.length})
            </h2>
            {urgentCandidates.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Alles auf dem neuesten Stand!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {urgentCandidates.map((candidate: any) => (
                  <div
                    key={candidate.id}
                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {candidate.firstName} {candidate.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {candidate.languagePair} · {candidate.bundesland?.bundeslandName}
                        </p>
                        {candidate.tasks?.[0] && (
                          <p className="text-xs text-red-600 mt-0.5">
                            ⏰ {candidate.tasks[0].title}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', STATUS_COLORS[candidate.status])}>
                      {STATUS_LABELS[candidate.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Pipeline Snapshot */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Pipeline</h2>
            <div className="space-y-2">
              {PIPELINE_ORDER.map((status) => (
                <div
                  key={status}
                  onClick={() => navigate(`/candidates?status=${status}`)}
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
                >
                  <span className="text-xs text-gray-600">{STATUS_LABELS[status]}</span>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', STATUS_COLORS[status])}>
                    {pipeline[status] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Letzte Aktivität</h2>
            <div className="space-y-3">
              {recentActivity.slice(0, 8).map((event: any) => (
                <div key={event.id} className="flex gap-2 text-xs text-gray-600">
                  <span className="text-gray-400 flex-shrink-0">{formatRelative(event.createdAt)}</span>
                  <span>
                    <span
                      className="font-medium text-blue-600 cursor-pointer hover:underline"
                      onClick={() => navigate(`/candidates/${event.candidateId}`)}
                    >
                      {event.candidate?.firstName} {event.candidate?.lastName}
                    </span>
                    {' '}→{' '}
                    <span className="font-medium">{STATUS_LABELS[event.toStatus]}</span>
                  </span>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-xs text-gray-400">Noch keine Aktivität</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
