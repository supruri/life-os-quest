import { CalendarDays, CheckCircle2, Circle } from 'lucide-react'

// Desktop adaptation of the Figma quest screen.
//
// Mobile stacks one mission card per row because that is all a phone has room for. On desktop the
// same cards flow into a responsive grid beside a persistent diary panel, so a week's work is
// visible without scrolling and the memo no longer sits below the fold. The card itself keeps the
// mobile contract exactly: the whole card is one toggle, and the AI overlay (when present) supplies
// the title and objective. No new state, no invented fields.

export default function DesktopQuest({
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
  overlayFor,
  isRestDay,
  isCurrentWeek,
  onGoToToday,
  weekLabel,
  memoTitle,
  memoHint,
  memoPlaceholder,
  memoValue,
  onMemoChange,
}) {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-black text-slate-950">{weekLabel}</h2>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600">
            {c.percentDone(weekPercent)}
          </span>
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={onGoToToday}
              className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
            >
              {c.todayButton}
            </button>
          )}
          <p className="ml-auto inline-flex items-center gap-1.5 text-sm font-bold text-slate-500">
            {dateLabel}
            <CalendarDays size={14} aria-hidden="true" />
          </p>
        </div>

        {/* Full week always visible — desktop has the width, so day switching costs one click
            and never hides the rest of the week behind a swipe. */}
        <div className="mt-5 grid grid-cols-7 gap-2">
          {days.map((day) => {
            const active = day.id === selectedDayId
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => onSelectDay(day.id)}
                aria-pressed={active}
                className={`h-11 rounded-xl text-sm font-black transition ${
                  active
                    ? 'bg-indigo-500 text-white'
                    : 'border border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {tr(day.label, lang)}
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-sm font-black text-indigo-600">
          {c.achieved(dayCompleted, dayMissions.length)}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {isRestDay ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-lg font-black text-slate-900">{c.todayRest}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{c.restNote}</p>
            </div>
          ) : dayMissions.length === 0 ? (
            /* A non-rest day can still have nothing scheduled (an unplanned week). Desktop puts the
               grid beside a fixed memo panel, so without this the column collapses and the page
               reads as broken rather than empty. */
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-base font-black text-slate-900">{c.noSessionToday}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {dayMissions.map((mission) => {
                const done = isDone(mission.id)
                const overlay = overlayFor?.(mission.id)
                return (
                  <button
                    key={mission.id}
                    type="button"
                    onClick={() => onToggle(mission.id)}
                    aria-pressed={done}
                    className={`flex h-full w-full flex-col rounded-2xl border p-5 text-left transition ${
                      done
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-black text-indigo-600">
                        {tr(mission.ko, lang)}
                      </span>
                      <span className="ml-auto">
                        {done ? (
                          <CheckCircle2 size={20} className="text-emerald-600" aria-hidden="true" />
                        ) : (
                          <Circle size={20} className="text-slate-300" aria-hidden="true" />
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-base font-black text-slate-950">
                      {overlay?.title || tr(mission.ko, lang)}
                    </p>
                    <p className={`mt-1 text-xs font-black ${done ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {done ? c.doneLabel : c.notStarted}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {overlay
                        ? tr({ ko: overlay.objectiveKo, en: overlay.objectiveEn }, lang)
                        : tr(mission.detail, lang)}
                    </p>
                    <span className="mt-auto pt-3">
                      <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-600">
                        +{mission.xp} XP
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black text-slate-900">{memoTitle}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{memoHint}</p>
          <textarea
            value={memoValue}
            onChange={(event) => onMemoChange(event.target.value)}
            placeholder={memoPlaceholder}
            className="mt-4 min-h-64 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white"
          />
        </section>
      </div>
    </div>
  )
}
