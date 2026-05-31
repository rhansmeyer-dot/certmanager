import { useQuery } from '@tanstack/react-query'
import { bundeslandApi } from '@/lib/api'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, cn } from '@/lib/utils'
import { useState } from 'react'

export default function BundeslandPage() {
  const { data: bundeslaender = [], isLoading } = useQuery({
    queryKey: ['bundesland'],
    queryFn: bundeslandApi.list,
  })
  const [selected, setSelected] = useState<any>(null)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Rechtsbibliothek</h1>
      <p className="text-sm text-gray-500">Bundesland-spezifische Zertifizierungsregeln</p>

      <div className="grid grid-cols-2 gap-6">
        {/* Bundesland Cards */}
        <div className="grid grid-cols-2 gap-3">
          {bundeslaender.map((bl: any) => (
            <button
              key={bl.id}
              onClick={() => setSelected(bl)}
              className={cn(
                'text-left p-4 rounded-xl border transition-all',
                selected?.id === bl.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900 text-lg">{bl.bundeslandCode}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', DIFFICULTY_COLORS[bl.difficulty])}>
                  {DIFFICULTY_LABELS[bl.difficulty]}
                </span>
              </div>
              <p className="text-xs text-gray-600">{bl.bundeslandName}</p>
              <p className="text-xs text-gray-400 mt-1">{bl._count?.candidates || 0} Kandidaten</p>
              <p className="text-xs mt-1">
                {bl.hasExceptionRule
                  ? <span className="text-green-600">✓ Ausnahmeregelung</span>
                  : <span className="text-red-500">✗ Keine Ausnahme</span>
                }
              </p>
            </button>
          ))}
          {isLoading && <p className="text-sm text-gray-400 col-span-2">Lädt...</p>}
        </div>

        {/* Detail */}
        {selected && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selected.bundeslandName}</h2>
                <span className={cn('text-sm px-2 py-1 rounded-full', DIFFICULTY_COLORS[selected.difficulty])}>
                  {DIFFICULTY_LABELS[selected.difficulty]}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {selected.courtName && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Zuständiges Gericht</h3>
                <p className="text-sm text-gray-800">{selected.courtName}</p>
                {selected.courtContact && <p className="text-xs text-gray-500 mt-0.5">{selected.courtContact}</p>}
              </div>
            )}

            {selected.legalBasisCitation && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Rechtsgrundlage</h3>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{selected.legalBasisCitation}</code>
              </div>
            )}

            {(selected.typicalCostMin || selected.estimatedDurationDays) && (
              <div className="grid grid-cols-2 gap-3">
                {selected.typicalCostMin && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Kosten</p>
                    <p className="text-sm font-semibold">{selected.typicalCostMin}–{selected.typicalCostMax} €</p>
                  </div>
                )}
                {selected.estimatedDurationDays && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Dauer</p>
                    <p className="text-sm font-semibold">ca. {Math.round(selected.estimatedDurationDays / 7)} Wochen</p>
                  </div>
                )}
              </div>
            )}

            {selected.specialNotes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Besonderheiten</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800 whitespace-pre-wrap">{selected.specialNotes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {!selected && (
          <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
            <p className="text-sm text-gray-400">Bundesland auswählen für Details</p>
          </div>
        )}
      </div>
    </div>
  )
}
