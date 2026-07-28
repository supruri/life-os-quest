import { Compass, Gauge, ListTree, NotebookPen, UserRound } from 'lucide-react'

// Desktop chrome for the Figma visual system.
//
// This is NOT the legacy `.life-dashboard` frame: that class in styles.css repaints every Tailwind
// utility into a dark palette, which is why desktop and mobile looked like two different products.
// The shell below stays on the same light/indigo system the Figma mobile screens use, and adapts it
// to desktop ergonomics instead of stretching a phone layout: a persistent left rail (no bottom
// nav, no hamburger), a single sticky top bar, and a bounded content column so line lengths stay
// readable on wide monitors.

// Reuses the same i18n keys as the mobile BottomNav, so the two navigations can never drift apart
// in wording — only in layout.
const NAV = [
  { id: 'home', icon: Compass, key: 'home' },
  { id: 'quest', icon: ListTree, key: 'quest' },
  { id: 'progress', icon: Gauge, key: 'progress' },
  { id: 'diary', icon: NotebookPen, key: 'diary' },
]

export default function DesktopShell({ c, lang, activeTab, onSelectTab, userName, onSignOut, onChangeLang, children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-6">
          <span className="text-lg font-black tracking-tight text-slate-950">Life Game</span>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600">
            {c.questBadge}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 p-1">
              {['ko', 'en'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChangeLang(option)}
                  aria-pressed={lang === option}
                  className={`h-7 w-10 rounded-md text-xs font-black transition ${
                    lang === option ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <UserRound size={15} className="shrink-0 text-indigo-500" aria-hidden="true" />
              <span className="min-w-0 max-w-48 truncate text-sm font-black text-slate-950">{userName}</span>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-500 transition hover:bg-slate-100"
            >
              {c.signOutLabel}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-6 py-6">
        {/* Persistent rail: on desktop the destination list is always visible, so navigation costs
            no clicks and no modal state — the desktop equivalent of the mobile bottom nav. */}
        <nav aria-label={c.questBadge} className="sticky top-22 h-fit w-56 shrink-0">
          <ul className="flex flex-col gap-1">
            {NAV.map(({ id, icon: Icon, key }) => {
              const active = activeTab === id
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onSelectTab(id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-black transition ${
                      active ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {c[key]}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
