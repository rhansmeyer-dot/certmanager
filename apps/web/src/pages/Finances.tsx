import { useQuery } from '@tanstack/react-query'
import { financialsApi } from '@/lib/api'
import { formatEur } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function FinancesPage() {
  const { data: summary } = useQuery({
    queryKey: ['financials', 'summary'],
    queryFn: financialsApi.summary,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Finanzen</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-1">Gesamtinvestition</p>
          <p className="text-3xl font-bold text-red-600">{formatEur(summary?.totalInvested || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-1">Einnahmen (speak2-Anteil)</p>
          <p className="text-3xl font-bold text-green-600">{formatEur(summary?.totalRevenue || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-1">Net-Position</p>
          <div className="flex items-center gap-2">
            {(summary?.netPosition || 0) >= 0
              ? <TrendingUp className="w-6 h-6 text-green-500" />
              : <TrendingDown className="w-6 h-6 text-red-500" />
            }
            <p className={`text-3xl font-bold ${(summary?.netPosition || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatEur(summary?.netPosition || 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Per-Kandidat Übersicht</h2>
        <p className="text-sm text-gray-400 text-center py-8">
          Finanzdaten werden über die Kandidatenprofile erfasst.
        </p>
      </div>
    </div>
  )
}
