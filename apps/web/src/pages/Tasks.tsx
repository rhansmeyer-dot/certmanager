import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckCircle, Clock, X, AlertCircle, User } from 'lucide-react'
import { tasksApi } from '@/lib/api'
import { cn, formatRelative } from '@/lib/utils'

const PRIORITY: Record<string, string> = {
  urgent: 'border-red-300 bg-red-50',
  high: 'border-orange-200 bg-orange-50',
  medium: 'border-blue-200 bg-white',
  low: 'border-gray-200 bg-white',
}
const PRIORITY_LABEL: Record<string, string> = {
  urgent: '🔴 Dringend', high: '🟠 Hoch', medium: '🔵 Mittel', low: '⚪ Niedrig',
}

export default function TasksPage() {
  const qc = useQueryClient()
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list(),
    refetchInterval: 60_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks'] })
  const complete = useMutation({ mutationFn: (id: string) => tasksApi.complete(id), onSuccess: invalidate })
  const snooze = useMutation({ mutationFn: (id: string) => tasksApi.snooze(id, 3), onSuccess: invalidate })
  const cancel = useMutation({ mutationFn: (id: string) => tasksApi.cancel(id), onSuccess: invalidate })

  const now = Date.now()
  const overdue = tasks.filter((t: any) => new Date(t.dueAt).getTime() < now)
  const upcoming = tasks.filter((t: any) => new Date(t.dueAt).getTime() >= now)

  function TaskCard({ t }: { t: any }) {
    const isOverdue = new Date(t.dueAt).getTime() < now
    return (
      <div className={cn('rounded-xl border p-4', PRIORITY[t.priority] || 'border-gray-200 bg-white')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{t.title}</p>
            {t.description && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{t.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
              <span>{PRIORITY_LABEL[t.priority] || t.priority}</span>
              <span className={cn('flex items-center gap-1', isOverdue && 'text-red-600 font-medium')}>
                <Clock className="w-3 h-3" /> {formatRelative(t.dueAt)}
              </span>
              {t.candidate && (
                <Link to={`/candidates/${t.candidate.id}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                  <User className="w-3 h-3" /> {t.candidate.firstName} {t.candidate.lastName}
                </Link>
              )}
              {t.assignedTo && <span className="text-gray-400">→ {t.assignedTo.fullName}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button onClick={() => complete.mutate(t.id)} disabled={complete.isPending}
              className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
              <CheckCircle className="w-3 h-3" /> Erledigt
            </button>
            <button onClick={() => snooze.mutate(t.id)} disabled={snooze.isPending}
              className="flex items-center gap-1 text-xs border border-gray-300 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50">
              <Clock className="w-3 h-3" /> +3 Tage
            </button>
            <button onClick={() => { if (confirm('Aufgabe wirklich verwerfen?')) cancel.mutate(t.id) }} disabled={cancel.isPending}
              className="flex items-center gap-1 text-xs text-gray-400 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50">
              <X className="w-3 h-3" /> Verwerfen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Aufgaben</h1>
        <p className="text-sm text-gray-500">{tasks.length} offene Aufgabe{tasks.length !== 1 ? 'n' : ''}</p>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Lädt…</p>}
      {!isLoading && tasks.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
          Keine offenen Aufgaben. 🎉
        </div>
      )}

      {overdue.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Überfällig ({overdue.length})
          </h2>
          {overdue.map((t: any) => <TaskCard key={t.id} t={t} />)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Anstehend ({upcoming.length})</h2>
          {upcoming.map((t: any) => <TaskCard key={t.id} t={t} />)}
        </div>
      )}
    </div>
  )
}
