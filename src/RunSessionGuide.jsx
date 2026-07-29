import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { tr } from './i18n.js'

// Accessible running-session guide.
//
// Shared by desktop and mobile so the two can never describe the same session differently. All
// content comes from deriveRunGuide() — this component formats, it never computes coaching values.
//
// Accessibility contract:
//  - role="dialog" + aria-modal, labelled by its own heading
//  - focus moves in on open and returns to the trigger on close, so keyboard users are not dropped
//    at the top of the document
//  - Escape closes; Tab is trapped inside while open
//  - the safety note is a live region so a screen reader announces it with the rest of the guide
export default function RunSessionGuide({ guide, lang, c, isDone, onComplete, onClose }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const returnFocusRef = useRef(null)

  useEffect(() => {
    returnFocusRef.current = document.activeElement
    closeRef.current?.focus()
    return () => {
      // Return focus to whatever opened the guide (the mission card / start button).
      const el = returnFocusRef.current
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusables = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  if (!guide) return null

  const minutes = (n) => (n == null ? null : c.minutesShort(n))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6">
      {/* Backdrop click closes. It is not focusable and is hidden from AT — Escape and the
          labelled close button are the accessible routes out. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-guide-title"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-6 sm:rounded-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black tracking-widest text-indigo-600">{c.runGuideBadge}</p>
            <h2 id="run-guide-title" className="mt-1 text-xl font-black text-slate-950">
              {guide.title || c.runGuideBadge}
            </h2>
            {guide.subtitle && <p className="mt-0.5 text-xs font-bold text-slate-500">{guide.subtitle}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={c.close}
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {guide.unitLabel && (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700">
            {guide.unitLabel}
          </p>
        )}

        {guide.estimatedMinutes != null && (
          <p className="mt-3 text-sm font-black text-slate-600">
            {c.estimatedTime(guide.estimatedMinutes)}
          </p>
        )}

        <ol className="mt-5 flex flex-col gap-3">
          {guide.steps.map((step, index) => (
            <li key={step.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-black text-indigo-600">
                  {index + 1}
                </span>
                <p className="text-sm font-black text-slate-950">{tr(step.label, lang)}</p>
                {/* Omitted entirely when the plan does not state a length — no invented duration. */}
                {step.minutes != null && (
                  <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-600">
                    {minutes(step.minutes)}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{tr(step.detail, lang)}</p>
            </li>
          ))}
        </ol>

        <p role="note" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-700">
          {tr(guide.safety, lang)}
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-xl border border-slate-200 text-sm font-black text-slate-600 transition hover:bg-slate-100"
          >
            {c.close}
          </button>
          <button
            type="button"
            onClick={onComplete}
            aria-pressed={isDone}
            className={`h-12 flex-1 rounded-xl text-sm font-black text-white transition ${
              isDone ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-500 hover:bg-indigo-600'
            }`}
          >
            {isDone ? c.markIncomplete : c.markComplete}
          </button>
        </div>
      </div>
    </div>
  )
}
