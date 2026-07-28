import { Home, Compass, Gauge, NotebookPen, UserRound } from 'lucide-react'

// Figma's 5-slot bottom bar. Mobile only — desktop keeps the left rail (App.jsx).
const ITEMS = [
  { id: 'home', icon: Home, key: 'home' },
  { id: 'quest', icon: Compass, key: 'quest' },
  { id: 'progress', icon: Gauge, key: 'progress' },
  { id: 'diary', icon: NotebookPen, key: 'diary' },
  { id: 'me', icon: UserRound, key: 'myInfo' },
]

export default function BottomNav({ active, onSelect, c }) {
  return (
    <nav className="sticky bottom-0 z-30 mx-auto flex w-full max-w-md border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {ITEMS.map(({ id, icon: Icon, key }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition ${
              isActive ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <Icon size={18} aria-hidden="true" />
            {c[key]}
          </button>
        )
      })}
    </nav>
  )
}
