import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, Mail, FileText, Euro,
  Scale, LogOut, Bell, Phone, Printer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { authApi, aiApi } from '@/lib/api'

const adminNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/candidates', icon: Users, label: 'Kandidaten' },
  { to: '/communications', icon: Mail, label: 'Kommunikation' },
  { to: '/documents', icon: FileText, label: 'Dokumente' },
  { to: '/finances', icon: Euro, label: 'Finanzen' },
  { to: '/bundesland', icon: Scale, label: 'Rechtsbibliothek' },
]

const thomasNavItems = [
  { to: '/dashboard', icon: Phone, label: 'Meine Anruf-Tasks' },
  { to: '/candidates', icon: Users, label: 'Kandidaten (Ansicht)' },
]

const dianaNavItems = [
  { to: '/dashboard', icon: Printer, label: 'Meine Aufgaben' },
]

export default function Layout() {
  const navigate = useNavigate()

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  })

  // KI-Update Queue Badge
  const { data: queue = [] } = useQuery({
    queryKey: ['ai-queue'],
    queryFn: aiApi.queue,
    refetchInterval: 30_000,
    enabled: me?.role === 'admin',
  })
  const pendingUpdates = queue.length

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const role = me?.role || 'staff'
  const isThomas = me?.email === 'thomas@speak2.de'
  const isDiana = me?.email === 'diana@speak2.de'

  const navItems = isThomas ? thomasNavItems
    : isDiana ? dianaNavItems
    : adminNavItems

  const roleLabel = isThomas ? '📞 Anrufe' : isDiana ? '🖨️ Versand' : '⚙️ Admin'

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">speak2</p>
              <p className="text-xs text-gray-500">CertManager</p>
            </div>
          </div>
        </div>

        {/* Role Badge */}
        {me && (
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-700 truncate">{me.fullName}</p>
            <p className="text-xs text-gray-400">{roleLabel}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-3">
            {/* KI-Update Badge (nur für Ramon) */}
            {pendingUpdates > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-3 py-1.5 rounded-full">
                <span>🤖</span>
                <span>{pendingUpdates} Update{pendingUpdates > 1 ? 's' : ''} warten</span>
              </div>
            )}
            <button className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </header>

        {/* Thomas: Rollenhinweis */}
        {isThomas && (
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-2 text-sm text-blue-800">
            📞 <strong>Deine Aufgabe:</strong> Kandidaten/Behörden anrufen → Ergebnis beim Kandidaten unter „Update einreichen" eintragen.
          </div>
        )}

        {/* Diana: Rollenhinweis */}
        {isDiana && (
          <div className="bg-green-50 border-b border-green-100 px-6 py-2 text-sm text-green-800">
            🖨️ <strong>Deine Aufgabe:</strong> Dokumente drucken, per Einschreiben versenden, Quittungen scannen und hochladen. Kein Ermessen nötig.
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
