import { FileText } from 'lucide-react'

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dokumente</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">Globaler Dokumententresor</p>
        <p className="text-sm text-gray-400">Dokumente werden pro Kandidat in der Kandidatendetailseite verwaltet.</p>
      </div>
    </div>
  )
}
