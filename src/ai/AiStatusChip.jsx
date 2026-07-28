// src/ai/AiStatusChip.jsx
// Non-blocking status toast: background 'pending' (AI still refining) or 'error' (retry).
// Rendered via a document.body portal (App.jsx) + fixed positioning, so it is NOT a descendant
// of `.life-dashboard` — this is deliberate (adv fix C): the grandfathered UNLAYERED rule
// `.life-dashboard button { color: inherit }` (styles.css:186) beats Tailwind v4's LAYERED
// `text-on-accent` utility, which would render the retry button's text near-invisible on bg-accent.
// Escaping `.life-dashboard` restores the token color. Placed at the BOTTOM to avoid overlapping the
// dashboard header (spec §5 said "top chip"; bottom toast is the same non-blocking role without the
// header collision — noted deviation).
export default function AiStatusChip({ variant, onRetry }) {
  let body = null
  if (variant === 'chip-pending') {
    body = (
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted" role="status" aria-live="polite">
        <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-surface-3 border-t-accent" />
        AI가 다듬는 중… 기본 플랜으로 먼저 시작했어요
      </div>
    )
  } else if (variant === 'chip-error') {
    body = (
      <div className="pointer-events-auto inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-border bg-surface px-4 py-2 text-sm text-text" role="alert">
        AI 맞춤 플랜은 아직 준비 중이에요. 기본 플랜으로 계속할게요.
        <button type="button" onClick={onRetry} className="rounded-full bg-accent px-3 py-1 font-black text-on-accent">
          다시 시도
        </button>
      </div>
    )
  }
  if (!body) return null
  // adv re-verify fix G: wrapper is pointer-events-none so its transparent full-width bands do not
  // intercept dashboard clicks; only the pill (pointer-events-auto) catches events. Keeps chip non-blocking.
  return <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">{body}</div>
}
