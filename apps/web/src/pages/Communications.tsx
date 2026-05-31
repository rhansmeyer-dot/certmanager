import { useQuery } from '@tanstack/react-query'
import { communicationsApi } from '@/lib/api'
import { formatRelative } from '@/lib/utils'
import { Mail } from 'lucide-react'

export default function CommunicationsPage() {
  const { data: pending = [] } = useQuery({
    queryKey: ['communications', 'pending'],
    queryFn: () => communicationsApi.list({ status: 'pending_approval' }),
  })
  const { data: sent = [] } = useQuery({
    queryKey: ['communications', 'sent'],
    queryFn: () => communicationsApi.list({ status: 'sent' }),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Kommunikation</h1>

      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-700 mb-3">Zur Freigabe ({pending.length})</h2>
          <div className="space-y-2">
            {pending.map((comm: any) => (
              <div key={comm.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{comm.subject}</p>
                  <p className="text-xs text-gray-500">
                    An: {comm.candidate?.firstName} {comm.candidate?.lastName} · von {comm.createdBy?.fullName} · {formatRelative(comm.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                    Genehmigen & Senden
                  </button>
                  <button className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition-colors">
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Gesendet ({sent.length})</h2>
        <div className="space-y-2">
          {sent.map((comm: any) => (
            <div key={comm.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{comm.subject}</p>
                  <p className="text-xs text-gray-500">
                    An: {comm.toAddresses?.join(', ')} · {formatRelative(comm.sentAt || comm.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {sent.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Noch keine gesendeten E-Mails</p>
          )}
        </div>
      </div>
    </div>
  )
}
