import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpenText, ChevronLeft, ChevronRight, LayoutDashboard,
  Menu, MessageSquareText, Plus, Search, Trash2, X,
} from 'lucide-react'
import { historyApi } from '../services/api'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chat', label: 'AI Chat', icon: MessageSquareText },
  { to: '/quiz', label: 'Quiz Studio', icon: BookOpenText },
  { to: '/knowledge', label: 'Knowledge Base', icon: Search },
]

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [historyQuery, setHistoryQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  const loadHistory = async () => {
    try { setHistory(await historyApi.list()) } catch { setHistory([]) }
  }

  useEffect(() => { loadHistory() }, [location.pathname])

  const deleteChat = async (event, id) => {
    event.preventDefault()
    event.stopPropagation()
    try {
      await historyApi.delete(id)
      setHistory(items => items.filter(item => item.id !== id))
      if (location.pathname === `/chat/${id}`) navigate('/chat')
    } catch {}
  }

  const filteredHistory = history.filter(item =>
    item.title.toLowerCase().includes(historyQuery.toLowerCase()),
  )

  const sidebar = (
    <>
      <div className="flex h-16 items-center justify-between px-4">
        <Link to="/chat" className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-terracotta text-sm font-bold text-white shadow-sm">K</div>
          {!collapsed && <span className="font-serif text-xl font-semibold tracking-tight text-charcoal">KernelMate</span>}
        </Link>
        <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-charcoal/50 lg:hidden" aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-3">
        <Link
          to="/chat"
          className={`mb-4 flex h-11 items-center rounded-xl bg-charcoal text-sm font-semibold text-white transition hover:bg-charcoal/90 ${collapsed ? 'justify-center' : 'gap-2 px-3'}`}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>New chat</span>}
        </Link>
      </div>

      <nav className="space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to !== '/chat'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex h-10 items-center rounded-xl text-sm font-medium transition ${collapsed ? 'justify-center' : 'gap-3 px-3'} ${
                isActive ? 'bg-terracotta/10 text-terracotta' : 'text-charcoal/65 hover:bg-charcoal/[0.04] hover:text-charcoal'
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-charcoal/[0.07] px-3 pt-4">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Search className="h-3.5 w-3.5 text-charcoal/35" />
            <input
              value={historyQuery}
              onChange={e => setHistoryQuery(e.target.value)}
              placeholder="Search history"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-charcoal/35"
            />
          </div>
          <div className="no-scrollbar flex-1 space-y-1 overflow-y-auto pb-3">
            {filteredHistory.map(item => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => { navigate(`/chat/${item.id}`); setMobileOpen(false) }}
                onKeyDown={e => e.key === 'Enter' && navigate(`/chat/${item.id}`)}
                className="group flex cursor-pointer items-center rounded-xl px-2 py-2 text-xs text-charcoal/60 hover:bg-charcoal/[0.04] hover:text-charcoal"
              >
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <button
                  onClick={event => deleteChat(event, item.id)}
                  className="ml-1 rounded-md p-1 text-charcoal/30 opacity-0 hover:text-terracotta group-hover:opacity-100"
                  aria-label={`Delete ${item.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {filteredHistory.length === 0 && (
              <p className="px-2 py-4 text-xs leading-5 text-charcoal/35">No conversations found.</p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setCollapsed(value => !value)}
        className="hidden h-12 items-center justify-center border-t border-charcoal/[0.07] text-charcoal/40 hover:text-charcoal lg:flex"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </>
  )

  return (
    <div className="min-h-screen bg-ivory text-charcoal">
      <aside className={`fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-charcoal/[0.07] bg-[#FBF8F1] transition-[width] lg:flex ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>
        {sidebar}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button className="absolute inset-0 bg-charcoal/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <aside className="relative flex h-full w-[280px] flex-col bg-[#FBF8F1] shadow-soft">{sidebar}</aside>
        </div>
      )}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center border-b border-charcoal/[0.06] bg-ivory/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 hover:bg-white" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/chat" className="ml-2 font-serif text-lg font-semibold">KernelMate</Link>
      </header>
      <main className={`min-h-screen pt-14 transition-[padding] lg:pt-0 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'}`}>
        {children}
      </main>
    </div>
  )
}
