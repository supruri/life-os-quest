import { CalendarDays, ChevronRight, CheckCircle2, Circle } from 'lucide-react'

// Q-A: the card keeps today's interaction — the whole card is one tap-to-complete button.
// Added from Figma: the `n / m 달성` row and the per-card status label. The duration chip
// ("약 30분") and the numbered step list are deliberately absent: `missions[]` carries no
// such fields, and inventing values is not a UI decision to make here.
export default function MobileQuest({
  c,
  days,
  tr,
  lang,
  selectedDayId,
  onSelectDay,
  dayMissions,
  isDone,
  onToggle,
  dateLabel,
  weekPercent,
  dayCompleted,
  onOpenProgress,
  overlayFor,
  hasGuide,
  isRestDay,
  isCurrentWeek,
  onGoToToday,
  memoTitle,
  memoHint,
  memoPlaceholder,
  memoValue,
  onMemoChange,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-4">
      <div className="flex items-center gap-2">
        <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-slate-600">
          {c.percentDone(weekPercent)}
        </span>
        {/* Mobile has no week nav, so this is the only route back to the current week. */}
        {!isCurrentWeek && (
          <button
            type="button"
            onClick={onGoToToday}
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-[10.5px] font-black text-indigo-700"
          >
            {c.todayButton}
          </button>
        )}
        <button
          type="button"
          onClick={onOpenProgress}
          className="ml-auto inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-slate-600"
        >
          {c.allQuests}
          <ChevronRight size={12} aria-hidden="true" />
        </button>
      </div>

      <div className="flex justify-between">
        {days.map((day) => {
          const active = day.id === selectedDayId
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => onSelectDay(day.id)}
              aria-pressed={active}
              className={`grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold transition ${
                active ? 'border-2 border-indigo-500 text-indigo-600' : 'text-slate-500'
              }`}
            >
              {tr(day.label, lang)}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[13px] font-black text-indigo-600">{c.achieved(dayCompleted, dayMissions.length)}</p>
        <p className="inline-flex items-center gap-1 text-[13px] font-bold text-slate-500">
          {dateLabel}
          <CalendarDays size={13} aria-hidden="true" />
        </p>
      </div>

      {isRestDay ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-base font-black text-slate-900">{c.todayRest}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{c.restNote}</p>
        </div>
      ) : (
        dayMissions.map((mission) => {
          const done = isDone(mission.id)
          const overlay = overlayFor?.(mission.id)
          // Mirrors desktop: a guided (running) card opens a dialog, so it must not advertise
          // toggle semantics to assistive tech.
          const guided = Boolean(hasGuide?.(mission.id))
          return (
            <button
              key={mission.id}
              type="button"
              onClick={() => onToggle(mission.id)}
              aria-haspopup={guided ? 'dialog' : undefined}
              aria-pressed={guided ? undefined : done}
              className={`w-full rounded-2xl border p-3.5 text-left transition ${
                done ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10.5px] font-black text-indigo-600">
                  {tr(mission.ko, lang)}
                </span>
                {guided && (
                  <span className="rounded-md border border-indigo-200 px-2 py-0.5 text-[10.5px] font-black text-indigo-600">
                    {c.runGuideBadge}
                  </span>
                )}
                <span className="ml-auto">
                  {done ? (
                    <CheckCircle2 size={18} className="text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Circle size={18} className="text-slate-300" aria-hidden="true" />
                  )}
                </span>
              </div>
              <p className="mt-1.5 text-[15px] font-black text-slate-950">
                {overlay?.title || tr(mission.ko, lang)}
              </p>
              <p className={`mt-1 text-[11.5px] font-black ${done ? 'text-emerald-600' : 'text-rose-600'}`}>
                {done ? c.doneLabel : c.notStarted}
              </p>
              <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                {overlay ? tr({ ko: overlay.objectiveKo, en: overlay.objectiveEn }, lang) : tr(mission.detail, lang)}
              </p>
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-600">
                +{mission.xp} XP
              </span>
            </button>
          )
        })
      )}

      {/* The diary/memo textarea existed only in the desktop quest column. Without it here a
          mobile-only user could never create a diary entry, so their board stayed empty. */}
      <section className="mt-1 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-black text-slate-900">{memoTitle}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{memoHint}</p>
        <textarea
          value={memoValue}
          onChange={(event) => onMemoChange(event.target.value)}
          placeholder={memoPlaceholder}
          className="mt-3 min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white"
        />
      </section>
    </div>
  )
}
