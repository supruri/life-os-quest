import { Flame } from 'lucide-react'
import { DAYS, parseWalkRun, sessionKind, isWorkout, isRunningPlan } from '../runningTrail.js'
import { sessionProgressPercent } from '../homeState.js'
import Trail from '../mobile/Trail.jsx'

// Desktop adaptation of the Figma home screen.
//
// Same visual system as MobileHome (white cards on slate-50, indigo accent, black weights) and the
// same derived data — but re-composed for a wide viewport instead of a stacked phone column:
// the today's-session hero and the week trail take the primary column, while progress, rhythm and
// vitality move into a rail so nothing is stretched to full monitor width. Every value shown here
// comes from the same homeModel the mobile screen consumes; no new state is introduced.

function Rhythm({ nodes, todayIndex, label }) {
  const W = 320
  const H = 84
  const max = Math.max(1, ...nodes.map((n) => n.sessions.length))
  const pts = nodes.map((n, i) => ({
    x: 12 + (i * (W - 24)) / (nodes.length - 1),
    y: H - 12 - (n.sessions.length / max) * (H - 26),
  }))
  const line = (slice) => slice.map((p) => `${p.x},${p.y}`).join(' ')
  const cut = todayIndex < 0 ? nodes.length - 1 : todayIndex

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} role="img" aria-label={label}>
      <polyline points={line(pts.slice(0, cut + 1))} fill="none" strokeWidth="2.5" className="stroke-indigo-500" />
      <polyline
        points={line(pts.slice(cut))}
        fill="none"
        strokeWidth="2.5"
        strokeDasharray="4 5"
        className="stroke-indigo-200"
      />
    </svg>
  )
}

export default function DesktopHome({
  c,
  displayName,
  weekLabel,
  quests,
  trailNodes,
  progress,
  isCurrentWeek,
  onGoToToday,
  vitalityDelta,
  todayKey: todayDayKey,
  todayLabel,
  todaySessions,
  onStartToday,
  todayDone,
}) {
  const percent = sessionProgressPercent(progress)
  const todayIndex = DAYS.findIndex(([k]) => k === todayDayKey)
  const running = isRunningPlan(quests)

  const primary =
    todaySessions.find((q) => sessionKind(q) === 'run') ??
    todaySessions.find(isWorkout) ??
    todaySessions[0] ??
    null
  const interval =
    primary && sessionKind(primary) === 'run'
      ? parseWalkRun(primary.objective?.ko || primary.unitLabel)
      : null

  const filled = Math.min(6, Math.round((vitalityDelta ?? 0) / 5))

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div className="flex flex-col gap-5 xl:col-span-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 truncate text-xl font-black text-slate-950">{displayName}</h1>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600">
              <Flame size={13} aria-hidden="true" />
              {weekLabel}
            </span>
            {!isCurrentWeek && (
              <button
                type="button"
                onClick={onGoToToday}
                className="ml-auto rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
              >
                {c.todayButton}
              </button>
            )}
          </div>

          <p className="mt-6 text-xs font-black tracking-widest text-slate-500">{c.todaysHeat(todayLabel)}</p>
          {interval ? (
            <p className="mt-2 text-5xl font-black leading-none tracking-tight text-slate-950">
              WALK {interval.walk.n} <span className="text-indigo-600">RUN {interval.run.n}</span>
            </p>
          ) : (
            <p className="mt-2 text-3xl font-black leading-tight text-slate-950">
              {primary ? primary.title : c.noSessionToday}
            </p>
          )}
          {primary?.objective?.ko && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{primary.objective.ko}</p>
          )}

          <button
            type="button"
            onClick={onStartToday}
            disabled={todaySessions.length === 0}
            className="mt-6 h-12 rounded-xl bg-indigo-500 px-8 text-sm font-black text-white transition hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {todayDone ? c.doneLabel : running ? c.startTodayWorkout : c.startTodaySession}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="mb-3 text-sm font-black tracking-wide text-slate-600">
            {running ? c.roadTo : c.weekTrail}
          </p>
          <Trail
            nodes={trailNodes}
            gateEmoji={running ? '🏁' : '⛳'}
            label={running ? c.roadTo : c.weekTrail}
          />
        </section>
      </div>

      <div className="flex flex-col gap-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black text-slate-600">{c.weekSessions(progress.done, progress.total)}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-slate-400">{c.percentDone(percent)}</p>

          <div className="mt-6 flex items-center gap-1.5">
            <span className="mr-1 shrink-0 text-xs font-black text-slate-600">{c.vitalityLabel}</span>
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-5 shrink-0 rounded-full ${i < filled ? 'bg-indigo-500' : 'bg-slate-200'}`}
              />
            ))}
            {vitalityDelta > 0 && (
              <span className="ml-1.5 shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-black text-indigo-600">
                +{vitalityDelta}
              </span>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="mb-2 text-sm font-black text-slate-600">{c.weeklyRhythm}</p>
          <Rhythm nodes={trailNodes} todayIndex={todayIndex} label={c.weeklyRhythm} />
          <div className="flex justify-between text-xs font-bold text-slate-400">
            {DAYS.map(([key, ko]) => (
              <span key={key} className={key === todayDayKey ? 'text-indigo-600' : undefined}>{ko}</span>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
