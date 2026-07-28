// src/aiFlow.js
// Pure presentation-surface derivation for the AI personalization flow (SP3).
// No React / Firebase imports — unit-testable with node:test, same convention as aiPlan.js.

// surface: 'cover' | 'chip-pending' | 'chip-error' | 'sheet' | 'none'
export function deriveAiSurface({ aiStatus, genPhase, revealDismissed, hasGoalSummary }) {
  if (aiStatus === 'error') return 'chip-error'
  // While genPhase is 'cover', keep the calm cover even if 'done' already arrived — the hook's
  // min-show timer flips genPhase to 'background' after AI_COVER_MIN_MS, and only THEN the sheet shows.
  if (genPhase === 'cover' && (aiStatus === 'pending' || aiStatus === 'done')) return 'cover'
  if (aiStatus === 'pending') return 'chip-pending' // genPhase === 'background'
  if (aiStatus === 'done' && hasGoalSummary && !revealDismissed) return 'sheet'
  return 'none'
}

// row = fetchAiPlan(userId) shape: { status, result, error } | null
// action: 'apply' (done w/ result -> overlay silently) | 'resume' (pending -> resume poll) | 'none'
export function deriveRehydrateAction(row) {
  if (!row) return 'none'
  if (row.status === 'done' && row.result) return 'apply'
  if (row.status === 'pending') return 'resume'
  return 'none'
}
