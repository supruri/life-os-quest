// src/ai/useAiFlow.js
import { useEffect, useRef, useState } from 'react'
import { fetchAiPlan } from '../firebase/index.js'
import { deriveAiSurface, deriveRehydrateAction } from '../aiFlow.js'

export const AI_COVER_MIN_MS = 1200      // anti-flash floor for the cover
export const AI_COVER_TIMEBOX_MS = 10000 // cover cap before falling to background (tune w/ real latency)

export function useAiFlow({ aiStatus, aiPlan, currentUserId, ready, onResume, onApplyRow, onRetry, enqueueSeq }) {
  const [genPhase, setGenPhase] = useState('cover')   // 'cover' | 'background'
  const [revealDismissed, setRevealDismissed] = useState(false)
  const coverShownAt = useRef(0)

  // Each fresh enqueue (enqueueSeq change) restarts the cover + clears dismissal.
  useEffect(() => {
    if (enqueueSeq === 0) return // 0 = no enqueue this session (e.g. returning user)
    setGenPhase('cover')
    setRevealDismissed(false)
    coverShownAt.current = Date.now()
    const timer = setTimeout(() => setGenPhase('background'), AI_COVER_TIMEBOX_MS)
    return () => clearTimeout(timer)
  }, [enqueueSeq])

  // When a result arrives while still on the cover, respect the min-show floor before revealing.
  useEffect(() => {
    if (aiStatus !== 'done' || genPhase !== 'cover') return
    const elapsed = Date.now() - (coverShownAt.current || Date.now())
    const wait = Math.max(0, AI_COVER_MIN_MS - elapsed)
    const t = setTimeout(() => setGenPhase('background'), wait) // background = cover removed; sheet shows over dashboard
    return () => clearTimeout(t)
  }, [aiStatus, genPhase])

  // Error while on the cover -> drop the cover to the dashboard (never trap on a failed gen screen).
  useEffect(() => {
    if (aiStatus === 'error' && genPhase === 'cover') setGenPhase('background')
  }, [aiStatus, genPhase])

  // Rehydrate-on-mount (D4): only AFTER the persisted state load settled (`ready`), and only when
  // there is no fresh enqueue and no applied overlay yet. Gating on `ready` removes the race with
  // fetchUserState (adv fix A-b) and avoids a redundant fetchAiPlan when a persisted plan exists.
  const rehydratedRef = useRef(false)
  useEffect(() => {
    if (rehydratedRef.current) return
    if (!ready || enqueueSeq !== 0 || aiPlan || !currentUserId) return
    rehydratedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const row = await fetchAiPlan(currentUserId)
        if (cancelled) return
        const action = deriveRehydrateAction(row)
        if (action === 'apply') {
          // adv fix A-a: a prior-session completion applied on mount is NOT a fresh generation —
          // it must be silent. Move genPhase off its initial 'cover' AND mark the reveal consumed
          // BEFORE onApplyRow flips aiStatus='done', so deriveAiSurface resolves to 'none'
          // (no cover, no sheet). The sibling 'resume' branch already left 'cover'; 'apply' must too.
          // (setState calls in this async tick are batched by React 18, so no intermediate 'cover' render.)
          setGenPhase('background')
          setRevealDismissed(true)
          onApplyRow(row)
        } else if (action === 'resume') {
          setGenPhase('background')
          onResume()
        }
      } catch {
        /* offline / no row — stay on default plan (non-blocking) */
      }
    })()
    return () => { cancelled = true }
  }, [ready, enqueueSeq, aiPlan, currentUserId, onApplyRow, onResume])

  const surface = deriveAiSurface({
    aiStatus,
    genPhase,
    revealDismissed,
    hasGoalSummary: Boolean(aiPlan?.goalSummary),
  })

  return {
    surface,
    onDismiss: () => setRevealDismissed(true),
    onRetry,
  }
}
