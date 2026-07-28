import { Flame } from 'lucide-react'
import { DAYS, parseWalkRun, sessionKind, isWorkout, isRunningPlan } from '../runningTrail.js'
import { sessionProgressPercent } from '../homeState.js'
import Trail from './Trail.jsx'

// Weekly rhythm: one point per weekday, height = sessions scheduled that day. Solid through
// today (actual), dashed after (planned) — the actual/planned split the Figma card shows.
function Rhythm({ nodes, todayIndex, label }) {
  const W = 320
  const H = 74
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

// L-2: the Figma annotation `레벨 정보 → 레벨 시스템 기획 전엔 제외` is honoured — no level
// badge and no XP bar. Session progress carries the header instead, so nothing reads blank.
export default function MobileHome({
  c,
  lang,
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

  // Running-specific chrome is shown ONLY when the plan actually contains run sessions —
  // the invariant runningTrail.js documents and RunningPlanView already honours. The default
  // 6-month curriculum has no run sessions, so it must not be framed as a running journey.
  const running = isRunningPlan(quests)

  // Same three-tier pick as RunningPlanView: a run, else a workout, else whatever is first.
  // Dropping the workout tier made the headline show 독서 under an "오늘 운동 시작" button.
  const primary =
    todaySessions.find((q) => sessionKind(q) === 'run') ??
    todaySessions.find(isWorkout) ??
    todaySessions[0] ??
    null
  // Gate on 'run' so a WALK/RUN headline is never derived from a non-running session.
  const interval =
    primary && sessionKind(primary) === 'run'
      ? parseWalkRun(primary.objective?.ko || primary.unitLabel)
      : null

  // 6 pips at 5 vitality points each — a readable scale over the weekly stat, not a level.
  const filled = Math.min(6, Math.round((vitalityDelta ?? 0) / 5))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-base font-black text-slate-950">{displayName}</h1>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-600">
            <Flame size={12} aria-hidden="true" />
            {weekLabel}
          </span>
        </div>

        <div className="mt-3 h-[7px] overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-bold text-slate-400">
          <span>{c.weekSessions(progress.done, progress.total)}</span>
          <span>{c.percentDone(percent)}</span>
        </div>

        <div className="mt-3 flex items-center gap-1">
          <span className="mr-1 shrink-0 text-[11px] font-black text-slate-600">{c.vitalityLabel}</span>
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={`h-[7px] w-4 shrink-0 rounded-full ${i < filled ? 'bg-indigo-500' : 'bg-slate-200'}`}
            />
          ))}
          {vitalityDelta > 0 && (
            <span className="ml-1.5 shrink-0 whitespace-nowrap rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-600">
              +{vitalityDelta}
            </span>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-1 text-xs font-black text-slate-600">{c.weeklyRhythm}</p>
        <Rhythm nodes={trailNodes} todayIndex={todayIndex} label={c.weeklyRhythm} />
        <div className="flex justify-between text-[10px] font-bold text-slate-400">
          {DAYS.map(([key, ko]) => (
            <span key={key} className={key === todayDayKey ? 'text-indigo-600' : undefined}>{ko}</span>
          ))}
        </div>
      </section>

      {!isCurrentWeek && (
        <button
          type="button"
          onClick={onGoToToday}
          className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700"
        >
          {c.todayButton}
        </button>
      )}

      <p className="text-[11px] font-black tracking-widest text-slate-500">{c.todaysHeat(todayLabel)}</p>

      {interval ? (
        <p className="text-[32px] font-black leading-none tracking-tight text-slate-950">
          WALK {interval.walk.n}
          <br />
          <span className="text-indigo-600">RUN {interval.run.n}</span>
        </p>
      ) : (
        <p className="text-2xl font-black leading-tight text-slate-950">
          {primary ? primary.title : c.noSessionToday}
        </p>
      )}
      {primary?.objective?.ko && (
        <p className="-mt-1 text-xs leading-5 text-slate-500">{primary.objective.ko}</p>
      )}

      <section>
        <p className="mb-1 text-xs font-black tracking-wide text-slate-600">
          {running ? c.roadTo : c.weekTrail}
        </p>
        <Trail
          nodes={trailNodes}
          gateEmoji={running ? '🏁' : '⛳'}
          label={running ? c.roadTo : c.weekTrail}
        />
      </section>

      <button
        type="button"
        onClick={onStartToday}
        disabled={todaySessions.length === 0}
        className="mt-1 h-12 w-full rounded-xl bg-indigo-500 text-sm font-black text-white transition hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400"
      >
        {todayDone ? c.doneLabel : running ? c.startTodayWorkout : c.startTodaySession}
      </button>
    </div>
  )
}
